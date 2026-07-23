import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../services/services.dart';
import 'chat_room_screen.dart';

class ChatsListScreen extends StatefulWidget {
  final String currentUserId;
  final String currentUserName;

  const ChatsListScreen({
    super.key,
    required this.currentUserId,
    required this.currentUserName,
  });

  @override
  State<ChatsListScreen> createState() => _ChatsListScreenState();
}

class _ChatsListScreenState extends State<ChatsListScreen> {
  // Store fetched profiles in memory to avoid redundant queries during scrolling/refreshing
  final Map<String, CSUser> _profileCache = {};

  String _formatDateTime(String? isoString) {
    if (isoString == null) return '';
    final dt = DateTime.tryParse(isoString);
    if (dt == null) return '';
    final now = DateTime.now();
    
    // Reset hours to check same-day date
    final today = DateTime(now.year, now.month, now.day);
    final messageDate = DateTime(dt.year, dt.month, dt.day);
    final diffDays = today.difference(messageDate).inDays;

    if (diffDays == 0) {
      final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
      final minute = dt.minute.toString().padLeft(2, '0');
      final period = dt.hour >= 12 ? 'PM' : 'AM';
      return '$hour:$minute $period';
    } else if (diffDays == 1) {
      return 'Yesterday';
    } else {
      final monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dt.month - 1];
      return '$monthName ${dt.day}';
    }
  }

  Future<CSUser?> _getPeerProfile(String peerId, AuthService authService) async {
    if (_profileCache.containsKey(peerId)) {
      return _profileCache[peerId];
    }
    final profile = await authService.fetchUserProfile(peerId);
    if (profile != null) {
      _profileCache[peerId] = profile;
    }
    return profile;
  }

  @override
  Widget build(BuildContext context) {
    final chatService = Provider.of<ChatService>(context, listen: false);
    final authService = Provider.of<AuthService>(context, listen: false);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Inbox Messages'),
      ),
      body: StreamBuilder<List<Map<String, dynamic>>>(
        stream: chatService.streamUserChats(widget.currentUserId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final chats = snapshot.data ?? [];

          if (chats.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.forum_outlined,
                    size: 80,
                    color: Colors.grey.withValues(alpha: 0.4),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'No Messages Yet',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Conversations with landlords or roommates will appear here.',
                    style: TextStyle(color: Colors.grey, fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: chats.length,
            separatorBuilder: (context, index) => const Divider(height: 1, indent: 76, color: Colors.black12),
            itemBuilder: (context, index) {
              final chat = chats[index];
              final chatRoomId = chat['id'].toString();
              final List participants = chat['participants'] ?? [];
              final peerId = participants.firstWhere(
                (p) => p != widget.currentUserId,
                orElse: () => '',
              );

              if (peerId.isEmpty) return const SizedBox.shrink();

              return FutureBuilder<CSUser?>(
                future: _getPeerProfile(peerId, authService),
                builder: (context, peerSnapshot) {
                  if (peerSnapshot.connectionState == ConnectionState.waiting && !_profileCache.containsKey(peerId)) {
                    return const ListTile(
                      leading: CircleAvatar(
                        child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                      ),
                      title: Text('Loading user info...'),
                    );
                  }

                  final peer = peerSnapshot.data;
                  final peerName = peer?.name ?? 'CampusStay User';
                  final peerAvatar = peer?.profilePic ?? 'https://api.dicebear.com/7.x/adventurer/png?seed=$peerId';
                  final peerRole = peer?.role ?? '';

                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    leading: CircleAvatar(
                      radius: 26,
                      backgroundImage: NetworkImage(peerAvatar),
                      backgroundColor: Colors.grey.shade100,
                    ),
                    title: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Flexible(
                                child: Text(
                                  peerName,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (peerRole.isNotEmpty) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: peerRole == 'owner' ? Colors.blue.shade50 : Colors.green.shade50,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    peerRole.toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                      color: peerRole == 'owner' ? Colors.blue : Colors.green,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        Text(
                          _formatDateTime(chat['last_message_at']),
                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      ],
                    ),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 4.0),
                      child: Text(
                        chat['last_message'] ?? 'Start chatting...',
                        style: const TextStyle(color: Colors.grey, fontSize: 13),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ChatRoomScreen(
                            chatRoomId: chatRoomId,
                            currentUserId: widget.currentUserId,
                            currentUserName: widget.currentUserName,
                            peerName: peerName,
                          ),
                        ),
                      );
                    },
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}

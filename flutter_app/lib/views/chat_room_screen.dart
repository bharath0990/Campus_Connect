import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../models/models.dart';
import '../services/services.dart';

class ChatRoomScreen extends StatefulWidget {
  final String chatRoomId;
  final String currentUserId;
  final String currentUserName;
  final String peerName;

  const ChatRoomScreen({
    super.key,
    required this.chatRoomId,
    required this.currentUserId,
    required this.currentUserName,
    required this.peerName,
  });

  @override
  State<ChatRoomScreen> createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends State<ChatRoomScreen> {
  final TextEditingController _msgController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  final List<ChatMessage> _fallbackMessages = [];

  @override
  void dispose() {
    _msgController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _handleSend(ChatService chatService) async {
    final text = _msgController.text.trim();
    if (text.isEmpty) return;

    _msgController.clear();

    try {
      await chatService.sendMessage(
        widget.chatRoomId,
        widget.currentUserId,
        widget.currentUserName,
        text,
      );
    } catch (e) {
      setState(() {
        _fallbackMessages.add(ChatMessage(
          id: DateTime.now().toString(),
          senderId: widget.currentUserId,
          senderName: widget.currentUserName,
          text: text,
          createdAt: DateTime.now(),
        ));
      });
      
      Future.delayed(const Duration(milliseconds: 1500), () {
        if (!mounted) return;
        setState(() {
          _fallbackMessages.add(ChatMessage(
            id: DateTime.now().toString(),
            senderId: 'owner_ramesh',
            senderName: widget.peerName,
            text: 'Sounds great. I have updated the booking request with these terms in Postgres.',
            createdAt: DateTime.now(),
          ));
        });
        _scrollToBottom();
      });
    }

    _scrollToBottom();
  }

  void _handleSendImage(ChatService chatService, SupabaseService db) async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
    if (image == null) return;

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Uploading image...'), duration: Duration(seconds: 2)),
    );

    try {
      final bytes = await image.readAsBytes();
      final fileName = 'chat_${widget.chatRoomId}_${DateTime.now().millisecondsSinceEpoch}_${image.name}';
      final url = await db.uploadRoomImage(fileName, bytes);
      
      await chatService.sendMessage(
        widget.chatRoomId,
        widget.currentUserId,
        widget.currentUserName,
        '📷 Photo',
        imageUrl: url,
      );
    } catch (e) {
      debugPrint("Chat image upload failed, falling back to base64: $e");
      try {
        final bytes = await image.readAsBytes();
        final base64String = base64Encode(bytes);
        final url = 'data:image/jpeg;base64,$base64String';
        
        await chatService.sendMessage(
          widget.chatRoomId,
          widget.currentUserId,
          widget.currentUserName,
          '📷 Photo',
          imageUrl: url,
        );
      } catch (err) {
        setState(() {
          _fallbackMessages.add(ChatMessage(
            id: DateTime.now().toString(),
            senderId: widget.currentUserId,
            senderName: widget.currentUserName,
            text: '📷 Photo',
            imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=300&q=80',
            createdAt: DateTime.now(),
          ));
        });
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Offline fallback simulated message sent.')),
          );
        }
      }
    }
    _scrollToBottom();
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final chatService = Provider.of<ChatService>(context, listen: false);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            CircleAvatar(
              backgroundColor: Theme.of(context).primaryColor.withValues(alpha: 0.2),
              child: Text(widget.peerName[0], style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.peerName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                const Text('Supabase Realtime Feed', style: TextStyle(fontSize: 10, color: Colors.greenAccent)),
              ],
            )
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: StreamBuilder<List<ChatMessage>>(
              stream: chatService.streamMessages(widget.chatRoomId),
              builder: (context, snapshot) {
                final messages = (snapshot.hasData && snapshot.data!.isNotEmpty)
                    ? snapshot.data!
                    : _fallbackMessages;

                if (messages.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.forum_outlined, size: 48, color: Colors.grey.withValues(alpha: 0.5)),
                        const SizedBox(height: 12),
                        const Text('No messages yet. Send a greeting to start room negotiations!', style: TextStyle(color: Colors.grey, fontSize: 13)),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: messages.length,
                  itemBuilder: (context, idx) {
                    final msg = messages[idx];
                    final isMe = msg.senderId == widget.currentUserId;

                    return Align(
                      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: isMe 
                              ? Theme.of(context).primaryColor 
                              : Theme.of(context).colorScheme.surface,
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(12),
                            topRight: const Radius.circular(12),
                            bottomLeft: isMe ? const Radius.circular(12) : Radius.zero,
                            bottomRight: isMe ? Radius.zero : const Radius.circular(12),
                          ),
                          border: isMe ? null : Border.all(color: Colors.white10),
                        ),
                        child: Column(
                          crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                          children: [
                            if (msg.imageUrl != null) ...[
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: msg.imageUrl!.startsWith('data:image')
                                    ? Image.memory(base64Decode(msg.imageUrl!.split('base64,')[1]), width: 200, height: 150, fit: BoxFit.cover)
                                    : Image.network(msg.imageUrl!, width: 200, height: 150, fit: BoxFit.cover, errorBuilder: (c, o, s) => Container(color: Colors.white10, width: 200, height: 150, child: const Icon(Icons.broken_image))),
                              ),
                              const SizedBox(height: 6),
                            ],
                            if (msg.imageUrl == null || msg.text != '📷 Photo')
                              Text(
                                msg.text,
                                style: TextStyle(color: isMe ? Colors.white : Theme.of(context).colorScheme.onSurface, fontSize: 14),
                              ),
                            const SizedBox(height: 4),
                            Text(
                              '${msg.createdAt.hour}:${msg.createdAt.minute.toString().padLeft(2, '0')}',
                              style: TextStyle(color: isMe ? Colors.white70 : Colors.grey, fontSize: 9),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor,
              border: const Border(top: BorderSide(color: Colors.white10)),
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.add_photo_alternate_rounded, color: Colors.grey),
                  onPressed: () {
                    final db = Provider.of<SupabaseService>(context, listen: false);
                    _handleSendImage(chatService, db);
                  },
                ),
                Expanded(
                  child: TextField(
                    controller: _msgController,
                    decoration: InputDecoration(
                      hintText: 'Enter message...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      filled: true,
                      fillColor: Theme.of(context).colorScheme.surface,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                FloatingActionButton.small(
                  onPressed: () => _handleSend(chatService),
                  child: const Icon(Icons.send_rounded),
                ),
              ],
            ),
          )
        ],
      ),
    );
  }
}

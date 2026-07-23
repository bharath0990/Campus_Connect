import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../services/services.dart';
import 'chat_room_screen.dart';

class RoommateMatchScreen extends StatefulWidget {
  final CSUser currentUser;
  const RoommateMatchScreen({super.key, required this.currentUser});

  @override
  State<RoommateMatchScreen> createState() => _RoommateMatchScreenState();
}

class _RoommateMatchScreenState extends State<RoommateMatchScreen> {
  List<Map<String, dynamic>> _candidates = [];
  bool _loading = true;

  // Added search and friending state
  Set<String> _friendIds = {};
  Set<String> _sentRequestIds = {};
  Set<String> _receivedRequestIds = {};
  List<CSUser> _friendsList = [];
  List<CSUser> _receivedRequestsList = [];
  bool _loadingFriends = false;
  bool _loadingPending = false;
  bool _showFriendsOnly = false;
  final _searchController = TextEditingController();

  StreamSubscription? _friendsSub;
  StreamSubscription? _sentRequestsSub;
  StreamSubscription? _receivedRequestsSub;

  @override
  void initState() {
    super.initState();
    _loadCandidates();
    _setupFriendStreams();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _friendsSub?.cancel();
    _sentRequestsSub?.cancel();
    _receivedRequestsSub?.cancel();
    super.dispose();
  }

  void _loadCandidates() async {
    final db = Provider.of<SupabaseService>(context, listen: false);
    final results = await db.matchRoommates(widget.currentUser);
    if (mounted) {
      setState(() {
        _candidates = results;
        _loading = false;
      });
    }
  }

  void _setupFriendStreams() {
    final authService = Provider.of<AuthService>(context, listen: false);
    final db = Provider.of<SupabaseService>(context, listen: false);
    
    _friendsSub = db.streamFriends(widget.currentUser.uid).listen((ids) async {
      if (!mounted) return;
      setState(() {
        _friendIds = ids.toSet();
        _loadingFriends = true;
      });

      final List<CSUser> friends = [];
      for (var id in ids) {
        final profile = await authService.fetchUserProfile(id);
        if (profile != null) {
          friends.add(profile);
        }
      }

      if (mounted) {
        setState(() {
          _friendsList = friends;
          _loadingFriends = false;
        });
      }
    });

    _sentRequestsSub = db.streamPendingRequestsSent(widget.currentUser.uid).listen((ids) {
      if (!mounted) return;
      setState(() {
        _sentRequestIds = ids.toSet();
      });
    });

    _receivedRequestsSub = db.streamPendingRequestsReceived(widget.currentUser.uid).listen((ids) async {
      if (!mounted) return;
      setState(() {
        _receivedRequestIds = ids.toSet();
        _loadingPending = true;
      });

      final List<CSUser> pending = [];
      for (var id in ids) {
        final profile = await authService.fetchUserProfile(id);
        if (profile != null) {
          pending.add(profile);
        }
      }

      if (mounted) {
        setState(() {
          _receivedRequestsList = pending;
          _loadingPending = false;
        });
      }
    });
  }

  void _performSearch(String query) async {
    if (query.trim().isEmpty) {
      _loadCandidates();
      return;
    }
    
    setState(() {
      _loading = true;
    });

    final db = Provider.of<SupabaseService>(context, listen: false);
    final results = await db.searchUsersByUsername(query.trim(), widget.currentUser.uid);
    
    if (mounted) {
      setState(() {
        _candidates = results.map((u) => _candidateFromUser(u)).toList();
        _loading = false;
      });
    }
  }

  Map<String, dynamic> _candidateFromUser(CSUser user) {
    return {
      'uid': user.uid,
      'name': user.name,
      'email': user.email,
      'avatar': user.profilePic,
      'college': 'RoomMate Student',
      'trustScore': user.trustScore,
      'matchPercentage': 92,
      'details': [
        {'criteria': 'Manual Username Search', 'score': 30}
      ],
      'sleepHabit': user.preferences.sleepHabit,
      'cleanliness': user.preferences.cleanliness,
      'dietary': user.preferences.dietary,
    };
  }





  Widget _buildFriendsListView() {
    if (_loadingFriends || _loadingPending) {
      return const Center(child: CircularProgressIndicator());
    }

    final db = Provider.of<SupabaseService>(context, listen: false);

    if (_friendsList.isEmpty && _receivedRequestsList.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.people_outline_rounded, size: 60, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            const Text('No Friends or Requests Yet', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.grey)),
            const SizedBox(height: 8),
            const Text('Search students by username to connect.', style: TextStyle(fontSize: 12, color: Colors.grey), textAlign: TextAlign.center),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.symmetric(vertical: 8),
      children: [
        if (_receivedRequestsList.isNotEmpty) ...[
          const Padding(
            padding: EdgeInsets.only(left: 20, top: 12, bottom: 8),
            child: Text(
              'PENDING REQUESTS',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.amber, letterSpacing: 1.0),
            ),
          ),
          ... _receivedRequestsList.map((req) {
            return Card(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              color: Colors.amber.shade50.withValues(alpha: 0.15),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundImage: NetworkImage(req.profilePic),
                  backgroundColor: Colors.grey.shade100,
                ),
                title: Text(req.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text('@${req.username} • Trust Score: ${req.trustScore}%'),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.check_circle_rounded, color: Colors.green),
                      tooltip: 'Accept Request',
                      onPressed: () async {
                        final success = await db.acceptFriendRequest(widget.currentUser.uid, req.uid);
                        if (!mounted) return;
                        if (success) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Accepted friend request from ${req.name}')));
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to accept request.'), backgroundColor: Colors.redAccent));
                        }
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.cancel_rounded, color: Colors.redAccent),
                      tooltip: 'Decline Request',
                      onPressed: () async {
                        final success = await db.removeFriend(widget.currentUser.uid, req.uid);
                        if (!mounted) return;
                        if (success) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Declined request from ${req.name}')));
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to decline request.'), backgroundColor: Colors.redAccent));
                        }
                      },
                    ),
                  ],
                ),
              ),
            );
          }),
          const Divider(height: 24, thickness: 1, color: Colors.white10),
        ],

        const Padding(
          padding: EdgeInsets.only(left: 20, top: 8, bottom: 8),
          child: Text(
            'MY FRIENDS',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1.0),
          ),
        ),
        if (_friendsList.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Text('No roommate connections confirmed yet.', style: TextStyle(fontSize: 13, color: Colors.grey, fontStyle: FontStyle.italic)),
          )
        else
          ... _friendsList.map((friend) {
            return Card(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundImage: NetworkImage(friend.profilePic),
                  backgroundColor: Colors.grey.shade100,
                ),
                title: Text(friend.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text('@${friend.username.isNotEmpty ? friend.username : 'student'} • Trust Score: ${friend.trustScore}%'),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.chat_bubble_outline_rounded, color: Colors.blueAccent),
                      tooltip: 'Chat with Friend',
                      onPressed: () async {
                        final chatService = Provider.of<ChatService>(context, listen: false);
                        final chatRoomId = await chatService.getOrCreateChatRoom(
                          widget.currentUser.uid,
                          friend.uid,
                          'Roommate Friends Chat',
                        );
                        if (!mounted) return;
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => ChatRoomScreen(
                              chatRoomId: chatRoomId,
                              currentUserId: widget.currentUser.uid,
                              currentUserName: widget.currentUser.name,
                              peerName: friend.name,
                            ),
                          ),
                        );
                      },
                    ),
                     IconButton(
                      icon: const Icon(Icons.person_remove_rounded, color: Colors.redAccent),
                      tooltip: 'Remove Friend',
                      onPressed: () async {
                        final success = await db.removeFriend(widget.currentUser.uid, friend.uid);
                        if (!mounted) return;
                        if (success) {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Removed friend connection.')));
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to remove friend.'), backgroundColor: Colors.redAccent));
                        }
                      },
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildMatchesView() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_candidates.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.search_off_rounded, size: 60, color: Colors.grey.shade400),
              const SizedBox(height: 16),
              const Text(
                'No matching roommates found.',
                textAlign: TextAlign.center,
                style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey),
              ),
              const SizedBox(height: 8),
              const Text(
                'Try updating your habits in your profile or search by a different username.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey, fontSize: 13),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: _candidates.length,
      itemBuilder: (context, index) {
        final candidate = _candidates[index];
        final matchPercentage = candidate['matchPercentage'] ?? 85;
        final candidateUid = candidate['uid'].toString();
        final bool isFriend = _friendIds.contains(candidateUid);
        final bool isSent = _sentRequestIds.contains(candidateUid);
        final bool isReceived = _receivedRequestIds.contains(candidateUid);
        final db = Provider.of<SupabaseService>(context, listen: false);

        return Card(
          margin: const EdgeInsets.symmetric(vertical: 8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 2,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundImage: NetworkImage(
                        candidate['avatar'] ?? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80',
                      ),
                      backgroundColor: Colors.grey.shade100,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                candidate['name'] ?? 'Student',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Theme.of(context).primaryColor.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  '$matchPercentage% Match',
                                  style: TextStyle(
                                    color: Theme.of(context).primaryColor,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 10,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            candidate['college'] ?? 'RoomMate Student',
                            style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                          ),
                          const SizedBox(height: 8),
                          // Small Badges Row
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                _buildSmallBadge(
                                  icon: Icons.bedtime_rounded,
                                  label: candidate['sleepHabit'] ?? 'Flexible',
                                  color: Colors.amber,
                                ),
                                const SizedBox(width: 6),
                                _buildSmallBadge(
                                  icon: Icons.clean_hands_rounded,
                                  label: candidate['cleanliness'] ?? 'Medium',
                                  color: Colors.blueAccent,
                                ),
                                const SizedBox(width: 6),
                                _buildSmallBadge(
                                  icon: Icons.restaurant_rounded,
                                  label: candidate['dietary'] ?? 'Any',
                                  color: Colors.greenAccent,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const Divider(height: 1, color: Colors.black12),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    // Button 1: Add Friend Status Button
                    Builder(
                      builder: (context) {
                        if (isFriend) {
                          return OutlinedButton.icon(
                            onPressed: () async {
                              final success = await db.removeFriend(widget.currentUser.uid, candidateUid);
                              if (!mounted) return;
                              if (success) {
                                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Removed friend connection.')));
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to remove friend. Please try again.'), backgroundColor: Colors.redAccent));
                              }
                            },
                            icon: const Icon(Icons.person_remove_rounded, color: Colors.redAccent, size: 16),
                            label: const Text('Remove Friend', style: TextStyle(color: Colors.redAccent, fontSize: 11)),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Colors.redAccent),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                          );
                        } else if (isSent) {
                          return OutlinedButton.icon(
                            onPressed: () async {
                              final success = await db.removeFriend(widget.currentUser.uid, candidateUid);
                              if (!mounted) return;
                              if (success) {
                                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cancelled friend request.')));
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to cancel request. Please try again.'), backgroundColor: Colors.redAccent));
                              }
                            },
                            icon: const Icon(Icons.pending_actions_rounded, color: Colors.orangeAccent, size: 16),
                            label: const Text('Cancel Request', style: TextStyle(color: Colors.orangeAccent, fontSize: 11)),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Colors.orangeAccent),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                          );
                        } else if (isReceived) {
                          return ElevatedButton.icon(
                            onPressed: () async {
                              final success = await db.acceptFriendRequest(widget.currentUser.uid, candidateUid);
                              if (!mounted) return;
                              if (success) {
                                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Friend request accepted!')));
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to accept request. Please try again.'), backgroundColor: Colors.redAccent));
                              }
                            },
                            icon: const Icon(Icons.check_circle_rounded, color: Colors.white, size: 16),
                            label: const Text('Accept Request', style: TextStyle(color: Colors.white, fontSize: 11)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                          );
                        } else {
                          return ElevatedButton.icon(
                            onPressed: () async {
                              final success = await db.addFriend(widget.currentUser.uid, candidateUid);
                              if (!mounted) return;
                              if (success) {
                                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Friend request sent!')));
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to send request. Check your connection.'), backgroundColor: Colors.redAccent));
                              }
                            },
                            icon: const Icon(Icons.person_add_rounded, color: Colors.white, size: 16),
                            label: const Text('Add Friend', style: TextStyle(color: Colors.white, fontSize: 11)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Theme.of(context).primaryColor,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                          );
                        }
                      },
                    ),

                    const SizedBox(width: 8),
                    // Button 2: Message Button
                    ElevatedButton.icon(
                      onPressed: () async {
                        final chatService = Provider.of<ChatService>(context, listen: false);
                        final chatRoomId = await chatService.getOrCreateChatRoom(
                          widget.currentUser.uid,
                          candidateUid,
                          'Roommate Compatibility',
                        );
                        if (!mounted) return;
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => ChatRoomScreen(
                              chatRoomId: chatRoomId,
                              currentUserId: widget.currentUser.uid,
                              currentUserName: widget.currentUser.name,
                              peerName: candidate['name'] ?? 'Student',
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.chat_bubble_outline_rounded, color: Colors.white, size: 16),
                      label: const Text('Message', style: TextStyle(color: Colors.white, fontSize: 11)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blueAccent,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSmallBadge({required IconData icon, required String label, required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(color: color.withValues(alpha: 0.9), fontSize: 9, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Tab segment selectors
        Container(
          margin: const EdgeInsets.all(16),
          height: 48,
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.03),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () => setState(() => _showFriendsOnly = false),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    decoration: BoxDecoration(
                      color: !_showFriendsOnly ? Theme.of(context).primaryColor : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        '🔥 Swipe Matches',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: !_showFriendsOnly ? Colors.white : Colors.black54,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: InkWell(
                  onTap: () => setState(() => _showFriendsOnly = true),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    decoration: BoxDecoration(
                      color: _showFriendsOnly ? Theme.of(context).primaryColor : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        '👥 Friends (${_friendsList.length})',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: _showFriendsOnly ? Colors.white : Colors.black54,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Search bar (visible in matches swipe tab only)
        if (!_showFriendsOnly)
          Padding(
            padding: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
            child: SearchBar(
              controller: _searchController,
              hintText: 'Search student by unique username',
              leading: const Icon(Icons.search),
              trailing: [
                if (_searchController.text.isNotEmpty)
                  IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: () {
                      _searchController.clear();
                      _performSearch('');
                    },
                  ),
              ],
              onSubmitted: _performSearch,
              onChanged: (v) {
                setState(() {});
              },
            ),
          ),

        Expanded(
          child: _showFriendsOnly ? _buildFriendsListView() : _buildMatchesView(),
        ),
      ],
    );
  }
}

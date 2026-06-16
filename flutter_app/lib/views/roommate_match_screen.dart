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
  int _cardIndex = 0;
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
        _cardIndex = 0;
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

  void _handleSwipe(bool like) {
    if (_candidates.isEmpty) return;
    if (like) {
      final matchedUser = _candidates[_cardIndex];
      _showMatchDialog(matchedUser);
    } else {
      _advanceCard();
    }
  }

  void _advanceCard() {
    if (_candidates.isEmpty) return;
    setState(() {
      _cardIndex = (_cardIndex + 1) % _candidates.length;
    });
  }

  void _showMatchDialog(Map<String, dynamic> candidate) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          backgroundColor: Theme.of(context).colorScheme.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('🔥 IT\'S A MATCH!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Theme.of(context).primaryColor)),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircleAvatar(radius: 36, backgroundImage: NetworkImage(widget.currentUser.profilePic)),
                  const SizedBox(width: 10),
                  const Icon(Icons.favorite, color: Colors.redAccent, size: 30),
                  const SizedBox(width: 10),
                  CircleAvatar(radius: 36, backgroundImage: NetworkImage(candidate['avatar'])),
                ],
              ),
              const SizedBox(height: 20),
              Text(
                'You and ${candidate['name']} have ${candidate['matchPercentage']}% compatibility. Start a chat room to connect.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    final chatService = Provider.of<ChatService>(context, listen: false);
                    final chatRoomId = await chatService.getOrCreateChatRoom(
                      widget.currentUser.uid,
                      candidate['uid'].toString(),
                      'Roommate Compatibility',
                    );
                    if (!mounted) return;
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ChatRoomScreen(
                          chatRoomId: chatRoomId,
                          currentUserId: widget.currentUser.uid,
                          currentUserName: widget.currentUser.name,
                          peerName: candidate['name'],
                        ),
                      ),
                    );
                    _advanceCard();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).primaryColor,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Send Message Now'),
                ),
              ),
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  _advanceCard();
                },
                child: const Text('Keep Swiping', style: TextStyle(color: Colors.grey)),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTranslucentBadge(BuildContext context, {required IconData icon, required String label, required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.55),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            label.toUpperCase(),
            style: const TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5),
          ),
        ],
      ),
    );
  }

  void _showBreakdownSheet(BuildContext context, Map<String, dynamic> candidate) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${candidate['name']}\'s Profile Index',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const Divider(color: Colors.white10),
              const SizedBox(height: 12),
              const Text(
                'Compatibility Score Breakdown',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.grey),
              ),
              const SizedBox(height: 16),
              ... (candidate['details'] as List).map((det) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8.0),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(det['criteria'], style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                          Text('${det['score']} / 30', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      LinearProgressIndicator(
                        value: det['score'] / 30.0,
                        backgroundColor: Colors.white10,
                        valueColor: AlwaysStoppedAnimation<Color>(Theme.of(context).primaryColor),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ],
                  ),
                );
              }).toList(),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
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
              color: Colors.amber.shade50.withOpacity(0.15),
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
                        await db.acceptFriendRequest(widget.currentUser.uid, req.uid);
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Accepted friend request from ${req.name}')));
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.cancel_rounded, color: Colors.redAccent),
                      tooltip: 'Decline Request',
                      onPressed: () async {
                        await db.removeFriend(widget.currentUser.uid, req.uid);
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Declined request from ${req.name}')));
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
                        if (!context.mounted) return;
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
                        await db.removeFriend(widget.currentUser.uid, friend.uid);
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Removed friend')));
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

    final candidate = _candidates[_cardIndex];
    final matchPercentage = candidate['matchPercentage'] ?? 85;
    final candidateUid = candidate['uid'].toString();
    final bool isFriend = _friendIds.contains(candidateUid);
    final bool isSent = _sentRequestIds.contains(candidateUid);
    final bool isReceived = _receivedRequestIds.contains(candidateUid);

    return Column(
      children: [
        Expanded(
          child: Card(
            elevation: 8,
            shadowColor: Colors.black26,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            clipBehavior: Clip.antiAlias,
            child: Stack(
              children: [
                Positioned.fill(
                  child: Image.network(
                    candidate['avatar'] ?? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80',
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      color: Colors.grey.shade900,
                      child: const Icon(Icons.person, size: 80, color: Colors.white24),
                    ),
                  ),
                ),

                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                        colors: [
                          Colors.black.withOpacity(0.85),
                          Colors.black.withOpacity(0.3),
                          Colors.transparent,
                        ],
                        stops: const [0.0, 0.5, 1.0],
                      ),
                    ),
                  ),
                ),

                Positioned(
                  top: 16,
                  right: 16,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.65),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Theme.of(context).primaryColor, width: 2),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.bolt_rounded, color: Theme.of(context).primaryColor, size: 16),
                        const SizedBox(width: 4),
                        Text(
                          '$matchPercentage% Match',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                Positioned(
                  bottom: 20,
                  left: 20,
                  right: 20,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  candidate['name'] ?? 'Student',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 26,
                                    fontWeight: FontWeight.bold,
                                    shadows: [
                                      Shadow(color: Colors.black45, blurRadius: 4, offset: Offset(0, 2)),
                                    ],
                                  ),
                                ),
                                Text(
                                  candidate['college'] ?? 'RoomMate Student',
                                  style: TextStyle(
                                    color: Colors.grey.shade300,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    shadows: const [
                                      Shadow(color: Colors.black45, blurRadius: 4, offset: Offset(0, 1)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Row(
                            children: [
                              Builder(
                                builder: (context) {
                                  if (isFriend) {
                                    return IconButton(
                                      icon: const Icon(Icons.person_remove_rounded, color: Colors.redAccent, size: 28),
                                      tooltip: 'Unfriend roommate',
                                      onPressed: () async {
                                        final db = Provider.of<SupabaseService>(context, listen: false);
                                        await db.removeFriend(widget.currentUser.uid, candidateUid);
                                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Removed friend connection.')));
                                      },
                                    );
                                  } else if (isSent) {
                                    return IconButton(
                                      icon: const Icon(Icons.pending_actions_rounded, color: Colors.orangeAccent, size: 28),
                                      tooltip: 'Request Sent (Cancel Request)',
                                      onPressed: () async {
                                        final db = Provider.of<SupabaseService>(context, listen: false);
                                        await db.removeFriend(widget.currentUser.uid, candidateUid);
                                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cancelled friend request.')));
                                      },
                                    );
                                  } else if (isReceived) {
                                    return IconButton(
                                      icon: const Icon(Icons.check_circle_rounded, color: Colors.greenAccent, size: 28),
                                      tooltip: 'Accept Friend Request',
                                      onPressed: () async {
                                        final db = Provider.of<SupabaseService>(context, listen: false);
                                        await db.acceptFriendRequest(widget.currentUser.uid, candidateUid);
                                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Friend request accepted!')));
                                      },
                                    );
                                  } else {
                                    return IconButton(
                                      icon: const Icon(Icons.person_add_rounded, color: Colors.white, size: 28),
                                      tooltip: 'Add Friend',
                                      onPressed: () async {
                                        final db = Provider.of<SupabaseService>(context, listen: false);
                                        await db.addFriend(widget.currentUser.uid, candidateUid);
                                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Friend request sent!')));
                                      },
                                    );
                                  }
                                },
                              ),
                              IconButton(
                                icon: const Icon(Icons.info_outline_rounded, color: Colors.white70, size: 28),
                                onPressed: () => _showBreakdownSheet(context, candidate),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(color: Colors.white24, height: 1),
                      const SizedBox(height: 16),

                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildTranslucentBadge(
                            context,
                            icon: Icons.bedtime_rounded,
                            label: candidate['sleepHabit'] ?? 'Flexible',
                            color: Colors.amber,
                          ),
                          _buildTranslucentBadge(
                            context,
                            icon: Icons.clean_hands_rounded,
                            label: '${candidate['cleanliness'] ?? 'Medium'} Clean',
                            color: Colors.blueAccent,
                          ),
                          _buildTranslucentBadge(
                            context,
                            icon: Icons.restaurant_rounded,
                            label: candidate['dietary'] ?? 'Any',
                            color: Colors.greenAccent,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),

        Padding(
          padding: const EdgeInsets.symmetric(vertical: 20.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 10, spreadRadius: 2),
                  ],
                ),
                child: FloatingActionButton(
                  heroTag: 'no_btn',
                  onPressed: () => _handleSwipe(false),
                  backgroundColor: Colors.grey.shade900,
                  foregroundColor: Colors.redAccent,
                  elevation: 2,
                  child: const Icon(Icons.close_rounded, size: 30),
                ),
              ),
              const SizedBox(width: 32),
              Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(color: Theme.of(context).primaryColor.withOpacity(0.2), blurRadius: 15, spreadRadius: 3),
                  ],
                ),
                child: FloatingActionButton.large(
                  heroTag: 'yes_btn',
                  onPressed: () => _handleSwipe(true),
                  backgroundColor: Theme.of(context).primaryColor,
                  foregroundColor: Colors.white,
                  elevation: 4,
                  child: const Icon(Icons.favorite_rounded, size: 38),
                ),
              ),
            ],
          ),
        ),
      ],
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
            color: Colors.black.withOpacity(0.03),
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

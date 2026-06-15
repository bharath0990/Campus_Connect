import 'dart:math';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../models/models.dart';
import '../services/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'chat_room_screen.dart';

class RoomDetailScreen extends StatefulWidget {
  final Room room;
  final CSUser currentStudent;
  final double studentLatitude;
  final double studentLongitude;

  const RoomDetailScreen({
    super.key,
    required this.room,
    required this.currentStudent,
    required this.studentLatitude,
    required this.studentLongitude,
  });

  @override
  State<RoomDetailScreen> createState() => _RoomDetailScreenState();
}

class _RoomDetailScreenState extends State<RoomDetailScreen> {
  double _panPositionX = 150.0;
  bool _tourActive = false;

  CSUser? _ownerUser;
  bool _loadingOwner = true;
  List<Map<String, dynamic>> _reviews = [];
  bool _loadingReviews = true;

  @override
  void initState() {
    super.initState();
    _loadOwnerProfile();
    _loadReviews();
  }

  void _loadOwnerProfile() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    try {
      final profile = await authService.fetchUserProfile(widget.room.ownerId);
      if (mounted) {
        setState(() {
          _ownerUser = profile;
          _loadingOwner = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loadingOwner = false;
        });
      }
    }
  }

  void _loadReviews() async {
    final db = Provider.of<SupabaseService>(context, listen: false);
    try {
      final reviewsList = await db.getRoomReviews(widget.room.id);
      if (mounted) {
        setState(() {
          _reviews = reviewsList;
          _loadingReviews = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loadingReviews = false;
        });
      }
    }
  }

  void _handleBookRoom(SupabaseService db) async {
    final bookingId = await db.createBooking(
      widget.room.id,
      widget.currentStudent.uid,
      widget.room.ownerId,
      widget.room.rent,
    );

    try {
      await db.createNotification(
        widget.room.ownerId,
        'booking',
        'New Booking Request',
        '${widget.currentStudent.name} has requested to book your PG/room "${widget.room.title}".',
      );
    } catch (e) {
      debugPrint("Failed to notify owner of new booking: $e");
    }

    if (!mounted) return;
    
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('🎉 Reservation Requested'),
          content: Text('Your booking request for "${widget.room.title}" has been registered. ID: $bookingId. Navigate to the bookings tab to pay the deposit.'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pop(context);
              },
              child: const Text('OK'),
            ),
          ],
        );
      },
    );
  }

  void _handleChatOwner(ChatService chatService, AuthService authService) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    String peerName = 'Room Owner';
    try {
      final ownerProfile = await authService.fetchUserProfile(widget.room.ownerId);
      if (ownerProfile != null) {
        peerName = ownerProfile.name;
      }
    } catch (e) {
      debugPrint("Failed to fetch owner profile: $e");
    }

    if (mounted) {
      Navigator.pop(context); // Dismiss loading dialog
    }

    final roomId = await chatService.getOrCreateChatRoom(
      widget.currentStudent.uid,
      widget.room.ownerId,
      widget.room.title,
    );

    if (!mounted) return;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ChatRoomScreen(
          chatRoomId: roomId,
          currentUserId: widget.currentStudent.uid,
          currentUserName: widget.currentStudent.name,
          peerName: peerName,
        ),
      ),
    );
  }

  void _showAddReviewDialog(SupabaseService db) {
    final commentController = TextEditingController();
    int selectedRating = 5;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Write a Review'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Your Rating', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (index) {
                      final starIndex = index + 1;
                      final isSelected = starIndex <= selectedRating;
                      return IconButton(
                        icon: Icon(
                          isSelected ? Icons.star : Icons.star_border,
                          color: isSelected ? Colors.amber : Colors.grey,
                          size: 32,
                        ),
                        onPressed: () {
                          setDialogState(() {
                            selectedRating = starIndex;
                          });
                        },
                      );
                    }),
                  ),
                  const SizedBox(height: 16),
                  const Text('Write a Comment', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: commentController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'Share your experience with this PG/room...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    if (commentController.text.trim().isEmpty) return;
                    
                    try {
                      await db.addRoomReview(
                        widget.room.id,
                        widget.currentStudent.uid,
                        widget.currentStudent.name,
                        selectedRating,
                        commentController.text.trim(),
                      );
                      
                      _loadReviews(); // Refresh reviews list
                      
                      if (context.mounted) {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Review submitted successfully!')),
                        );
                      }
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Failed to submit review: $e')),
                        );
                      }
                    }
                  },
                  child: const Text('Submit'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  double _getRoomLatitude() {
    if (widget.room.latitude != null) return widget.room.latitude!;
    if (widget.room.city.toLowerCase() == 'bangalore') return 12.9716;
    if (widget.room.city.toLowerCase() == 'delhi') return 28.6921;
    if (widget.room.city.toLowerCase() == 'hyderabad') return 17.4065;
    return 12.9716;
  }

  double _getRoomLongitude() {
    if (widget.room.longitude != null) return widget.room.longitude!;
    if (widget.room.city.toLowerCase() == 'bangalore') return 77.5946;
    if (widget.room.city.toLowerCase() == 'delhi') return 77.2090;
    if (widget.room.city.toLowerCase() == 'hyderabad') return 78.4772;
    return 77.5946;
  }

  double _getDistanceInKm(double lat1, double lon1, double lat2, double lon2) {
    var p = 0.017453292519943295; // Math.PI / 180
    var c = cos;
    var a = 0.5 - c((lat2 - lat1) * p)/2 + 
           c(lat1 * p) * c(lat2 * p) * 
           (1 - c((lon2 - lon1) * p))/2;
    return 12742 * asin(sqrt(a)); // 2 * R; R = 6371 km
  }

  Widget _buildRouteMap() {
    final studentPos = LatLng(widget.studentLatitude, widget.studentLongitude);
    final roomPos = LatLng(_getRoomLatitude(), _getRoomLongitude());
    
    final distance = _getDistanceInKm(
      widget.studentLatitude,
      widget.studentLongitude,
      _getRoomLatitude(),
      _getRoomLongitude(),
    );
    final distanceText = distance < 1.0 
        ? '${(distance * 1000).toStringAsFixed(0)} meters' 
        : '${distance.toStringAsFixed(2)} km';

    // Center coordinates between student and room
    final centerLat = (widget.studentLatitude + _getRoomLatitude()) / 2;
    final centerLng = (widget.studentLongitude + _getRoomLongitude()) / 2;
    final centerPos = LatLng(centerLat, centerLng);

    return Container(
      height: 250,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade300),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Positioned.fill(
            child: FlutterMap(
              options: MapOptions(
                initialCenter: centerPos,
                initialZoom: 13.5,
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.campusstay.app',
                ),
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: [studentPos, roomPos],
                      color: Theme.of(context).primaryColor,
                      strokeWidth: 4.0,
                    ),
                  ],
                ),
                MarkerLayer(
                  markers: [
                    Marker(
                      point: studentPos,
                      width: 40,
                      height: 40,
                      child: const Icon(
                        Icons.person_pin_circle,
                        color: Colors.blueAccent,
                        size: 40,
                      ),
                    ),
                    Marker(
                      point: roomPos,
                      width: 40,
                      height: 40,
                      child: Icon(
                        Icons.location_on,
                        color: Theme.of(context).primaryColor,
                        size: 40,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Positioned(
            bottom: 12,
            left: 12,
            right: 12,
            child: Card(
              color: Colors.white,
              elevation: 4,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Row(
                  children: [
                    Icon(Icons.directions_walk, color: Theme.of(context).primaryColor),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Distance: $distanceText',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.black87),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.navigation_rounded, color: Colors.blueAccent),
                      tooltip: 'Get directions on Google Maps',
                      onPressed: () async {
                        final lat = _getRoomLatitude();
                        final lon = _getRoomLongitude();
                        final mapsUrl = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lon');
                        if (await canLaunchUrl(mapsUrl)) {
                          await launchUrl(mapsUrl, mode: LaunchMode.externalApplication);
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Could not open Google Maps')),
                          );
                        }
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final db = Provider.of<SupabaseService>(context, listen: false);
    final chatService = Provider.of<ChatService>(context, listen: false);

    return Scaffold(
      appBar: AppBar(title: Text(widget.room.title)),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _tourActive 
                ? Container(
                    height: 250,
                    color: Colors.black,
                    child: GestureDetector(
                      onHorizontalDragUpdate: (details) {
                        setState(() {
                          _panPositionX = (_panPositionX + details.delta.dx) % 400.0;
                        });
                      },
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Positioned(
                            left: -_panPositionX,
                            child: Image.network(
                              'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80',
                              height: 250,
                              fit: BoxFit.none,
                              width: 800,
                            ),
                          ),
                          Container(
                            color: Colors.black45,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            child: const Text('◀ Drag to pan 360° Virtual Tour Mock ▶', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                          ),
                          Positioned(
                            bottom: 10,
                            right: 10,
                            child: TextButton.icon(
                              style: TextButton.styleFrom(backgroundColor: Colors.black),
                              icon: const Icon(Icons.close, color: Colors.white),
                              label: const Text('Exit Tour', style: TextStyle(color: Colors.white)),
                              onPressed: () => setState(() => _tourActive = false),
                            ),
                          )
                        ],
                      ),
                    ),
                  )
                : Stack(
                    children: [
                      _buildRoomImage(widget.room.images.first, height: 250, width: double.infinity, fit: BoxFit.cover),
                      Positioned(
                        bottom: 12,
                        right: 12,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.black87, foregroundColor: Colors.white),
                          onPressed: () => setState(() => _tourActive = true),
                          icon: const Icon(Icons.threed_rotation_rounded),
                          label: const Text('360° Walkthrough'),
                        ),
                      ),
                    ],
                  ),

            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('📍 ${widget.room.city}', style: TextStyle(color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold, fontSize: 14)),
                      Row(
                        children: [
                          const Icon(Icons.star, color: Colors.amber, size: 18),
                          Text(' ${widget.room.rating}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(widget.room.title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  
                  StreamBuilder<List<Booking>>(
                    stream: db.streamActiveBookingsForRoom(widget.room.id),
                    builder: (context, snapshot) {
                      final activeBookings = snapshot.data ?? [];
                      final occupantCount = activeBookings.length;
                      final spacesLeft = widget.room.capacity - occupantCount;
                      final isFull = spacesLeft <= 0;

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isFull ? Colors.red.withOpacity(0.08) : Colors.green.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: isFull ? Colors.redAccent.withOpacity(0.3) : Colors.greenAccent.withOpacity(0.3)),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  isFull ? Icons.block_flipped : Icons.people_outline_rounded,
                                  color: isFull ? Colors.redAccent : Colors.green,
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        isFull ? '🔴 Fully Booked (Room Full)' : '🟢 Spaces Available for Sharing',
                                        style: TextStyle(fontWeight: FontWeight.bold, color: isFull ? Colors.redAccent : Colors.green.shade800, fontSize: 13),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Occupancy: $occupantCount active roommate${occupantCount == 1 ? '' : 's'} (Capacity: ${widget.room.capacity}) • ${isFull ? 'No' : spacesLeft} space${spacesLeft == 1 ? '' : 's'} left',
                                        style: const TextStyle(fontSize: 12, color: Colors.black54),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],
                      );
                    },
                  ),
                  
                  const Text('About this Accommodation', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 8),
                  Text(widget.room.description, style: const TextStyle(fontSize: 14, color: Colors.grey, height: 1.5)),
                  const SizedBox(height: 24),

                  const Text('Proximity & Route Map', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 12),
                  _buildRouteMap(),
                  const SizedBox(height: 24),
                  
                  const Text('Key Amenities Included', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: widget.room.amenities.map((facility) {
                      return Chip(
                        label: Text(facility),
                        avatar: Icon(_getAmenityIcon(facility), size: 14),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 32),

                  const Divider(height: 40),
                  const Text('Host Profile', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 12),
                  if (_loadingOwner)
                    const Center(child: CircularProgressIndicator())
                  else if (_ownerUser != null)
                    Card(
                      elevation: 0,
                      color: Colors.grey.shade50,
                      shape: RoundedRectangleBorder(
                        side: BorderSide(color: Colors.grey.shade200),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 28,
                              backgroundImage: NetworkImage(_ownerUser!.profilePic),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        _ownerUser!.name,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                      ),
                                      if (_ownerUser!.verified) ...[
                                        const SizedBox(width: 6),
                                        Icon(
                                          Icons.verified_user_rounded,
                                          color: Theme.of(context).primaryColor,
                                          size: 18,
                                        ),
                                      ],
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _ownerUser!.verified
                                        ? 'Verified Host • Trust Score: ${_ownerUser!.trustScore}%'
                                        : 'Unverified Host • Trust Score: ${_ownerUser!.trustScore}%',
                                    style: TextStyle(
                                      color: _ownerUser!.verified ? Colors.green.shade700 : Colors.amber.shade800,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                  const Divider(height: 40),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Reviews & Ratings', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      TextButton.icon(
                        icon: const Icon(Icons.rate_review_outlined, size: 18),
                        label: const Text('Write Review'),
                        onPressed: () => _showAddReviewDialog(db),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (_loadingReviews)
                    const Center(child: CircularProgressIndicator())
                  else if (_reviews.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      alignment: Alignment.center,
                      child: const Text(
                        'No reviews yet. Be the first to rate this room!',
                        style: TextStyle(color: Colors.grey, fontSize: 13),
                      ),
                    )
                  else
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _reviews.length,
                      itemBuilder: (context, index) {
                        final rev = _reviews[index];
                        final rRating = rev['rating'] ?? 5;
                        final rComment = rev['comment'] ?? '';
                        final rStudent = rev['student_name'] ?? 'Student';
                        
                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            side: BorderSide(color: Colors.grey.shade100),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      rStudent,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                    ),
                                    Row(
                                      children: List.generate(5, (sIdx) {
                                        return Icon(
                                          sIdx < rRating ? Icons.star : Icons.star_border,
                                          color: Colors.amber,
                                          size: 14,
                                        );
                                      }),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  rComment,
                                  style: const TextStyle(fontSize: 13, color: Colors.black87, height: 1.4),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  const SizedBox(height: 24),

                  StreamBuilder<List<Booking>>(
                    stream: db.streamActiveBookingsForRoom(widget.room.id),
                    builder: (context, snapshot) {
                      final activeBookings = snapshot.data ?? [];
                      final occupantCount = activeBookings.length;
                      final spacesLeft = widget.room.capacity - occupantCount;
                      final isFull = spacesLeft <= 0;
                      
                      final isUserBooked = activeBookings.any((b) => b.studentId == widget.currentStudent.uid);

                      return Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () {
                                final authService = Provider.of<AuthService>(context, listen: false);
                                _handleChatOwner(chatService, authService);
                              },
                              style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                              icon: const Icon(Icons.forum_outlined),
                              label: const Text('Contact Owner'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          if (isUserBooked)
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: () async {
                                  final activeRoommateIds = activeBookings.map((b) => b.studentId).toList();
                                  final chatRoomId = await chatService.getOrCreateRoommateGroupChat(
                                    widget.room.id,
                                    widget.room.title,
                                    activeRoommateIds,
                                  );
                                  if (!context.mounted) return;
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => ChatRoomScreen(
                                        chatRoomId: chatRoomId,
                                        currentUserId: widget.currentStudent.uid,
                                        currentUserName: widget.currentStudent.name,
                                        peerName: 'Roommates: ${widget.room.title}',
                                      ),
                                    ),
                                  );
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.green,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                ),
                                icon: const Icon(Icons.group_rounded),
                                label: const Text('Roommates Chat', style: TextStyle(fontWeight: FontWeight.bold)),
                              ),
                            )
                          else
                            Expanded(
                              child: ElevatedButton(
                                onPressed: isFull ? null : () => _handleBookRoom(db),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: isFull ? Colors.grey : Theme.of(context).primaryColor,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                ),
                                child: Text(
                                  isFull ? 'Fully Booked' : 'Book Accomodation',
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
                              ),
                            ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getAmenityIcon(String facility) {
    switch (facility.toLowerCase()) {
      case 'wifi': return Icons.wifi;
      case 'ac': return Icons.ac_unit_rounded;
      case 'geyser': return Icons.hot_tub;
      case 'food': return Icons.restaurant;
      case 'laundry': return Icons.local_laundry_service;
      case 'pet friendly': return Icons.pets;
      default: return Icons.check_circle_outline;
    }
  }

  Widget _buildRoomImage(String url, {double? width, double? height, BoxFit fit = BoxFit.cover}) {
    if (url.startsWith('data:image') && url.contains('base64,')) {
      try {
        final base64Content = url.split('base64,')[1];
        final decodedBytes = base64Decode(base64Content);
        return Image.memory(decodedBytes, width: width, height: height, fit: fit);
      } catch (e) {
        return Container(
          color: Colors.grey.shade200,
          width: width,
          height: height,
          child: const Center(child: Icon(Icons.broken_image, size: 40)),
        );
      }
    }
    return Image.network(
      url,
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (c, o, s) => Container(
        color: Colors.grey.shade200,
        width: width,
        height: height,
        child: const Center(
          child: Icon(Icons.broken_image, size: 40, color: Colors.grey),
        ),
      ),
    );
  }
}

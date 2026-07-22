import 'dart:math';
import 'dart:convert';
import 'dart:async';
import 'dart:io' as io;
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../models/models.dart';
import '../services/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:image_picker/image_picker.dart';
import 'room_detail_screen.dart';
import 'ticket_system_screen.dart';
import 'login_screen.dart';
import 'login_selection_screen.dart';
import 'roommate_match_screen.dart';
import 'payment_success_screen.dart';
import 'lease_agreement_screen.dart';
import 'room_expenses_screen.dart';
import 'razorpay_checkout_sheet.dart';
import 'camera_scan_overlay.dart';
import 'chats_list_screen.dart';
import 'chat_room_screen.dart';
import 'blocked_screen.dart';

class StudentHomeScreen extends StatefulWidget {
  final CSUser user;
  const StudentHomeScreen({super.key, required this.user});

  @override
  State<StudentHomeScreen> createState() => _StudentHomeScreenState();
}

class _StudentHomeScreenState extends State<StudentHomeScreen> {
  int _currentIndex = 0;
  String _searchCity = '';
  final List<Room> _comparisonList = [];
  
  Position? _currentPosition;
  bool _loadingLocation = false;
  bool _showMapView = false;
  Room? _selectedMapRoom;

  late CSUser _currentUser;
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _usernameController = TextEditingController();
  
  int _budgetMin = 2000;
  int _budgetMax = 15000;
  String _sleepHabit = 'flexible';
  String _cleanliness = 'medium';
  String _dietary = 'any';
  String _socialStatus = 'medium';
  bool _profileSaving = false;
  bool _processingPayment = false;
  String _profilePic = '';

  final List<String> _predefinedAvatars = const [
    'https://api.dicebear.com/7.x/avataaars/png?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Milo',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Sophia',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Jack',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Lily',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Leo',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Maya',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Oliver',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Zoe',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Max',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Luna',
  ];

  StreamSubscription<List<Map<String, dynamic>>>? _notificationsSubscription;
  StreamSubscription<CSUser?>? _profileSubscription;
  Set<String> _seenNotificationIds = {};

  @override
  void initState() {
    super.initState();
    _currentUser = widget.user;
    _nameController.text = _currentUser.name;
    _phoneController.text = _currentUser.phone;
    _budgetMin = _currentUser.preferences.budgetMin;
    _budgetMax = _currentUser.preferences.budgetMax;
    _sleepHabit = _currentUser.preferences.sleepHabit;
    _cleanliness = _currentUser.preferences.cleanliness;
    _dietary = _currentUser.preferences.dietary;
    _socialStatus = _currentUser.preferences.socialStatus;
    _profilePic = _currentUser.profilePic;
    _usernameController.text = _currentUser.username;
    _fetchLocation();
    
    final authService = Provider.of<AuthService>(context, listen: false);
    _profileSubscription = authService.streamUserProfile(_currentUser.uid).listen((profile) {
      if (profile != null && profile.blocked && mounted) {
        _profileSubscription?.cancel();
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const BlockedScreen()),
          (route) => false,
        );
      }
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final db = Provider.of<SupabaseService>(context, listen: false);
      _setupNotificationsListener(db, _currentUser.uid);
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _usernameController.dispose();
    _notificationsSubscription?.cancel();
    _profileSubscription?.cancel();
    super.dispose();
  }

  void _pickAndUploadPhoto(AuthService authService) async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
    if (pickedFile == null) return;

    setState(() {
      _profileSaving = true;
    });

    try {
      final bytes = await pickedFile.readAsBytes();
      final publicUrl = await authService.uploadAvatar(_currentUser.uid, bytes);
      setState(() {
        _profilePic = publicUrl;
        _profileSaving = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Custom photo uploaded successfully!')),
        );
      }
    } catch (e) {
      setState(() {
        _profileSaving = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e')),
        );
      }
    }
  }

  Widget _buildChoiceChips({
    required String label,
    required String currentValue,
    required Map<String, String> options,
    required ValueChanged<String> onSelected,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8.0,
          runSpacing: 4.0,
          children: options.entries.map((entry) {
            final isSelected = currentValue == entry.key;
            return ChoiceChip(
              label: Text(entry.value),
              selected: isSelected,
              selectedColor: Theme.of(context).primaryColor.withOpacity(0.2),
              checkmarkColor: Theme.of(context).primaryColor,
              labelStyle: TextStyle(
                color: isSelected ? Theme.of(context).primaryColor : Colors.black87,
                fontWeight: isSelected ? FontWeight.bold : null,
                fontSize: 12,
              ),
              onSelected: (selected) {
                if (selected) {
                  onSelected(entry.key);
                }
              },
            );
          }).toList(),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Future<void> _fetchLocation() async {
    setState(() {
      _loadingLocation = true;
    });
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint("Location services are disabled.");
        setState(() {
          _loadingLocation = false;
        });
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          debugPrint("Location permissions are denied.");
          setState(() {
            _loadingLocation = false;
          });
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        debugPrint("Location permissions are permanently denied.");
        setState(() {
          _loadingLocation = false;
        });
        return;
      }

      Position pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      setState(() {
        _currentPosition = pos;
        _loadingLocation = false;
      });
    } catch (e) {
      debugPrint("Error fetching location: $e");
      setState(() {
        _loadingLocation = false;
      });
    }
  }

  double _getDistanceInKm(double lat1, double lon1, double lat2, double lon2) {
    var p = 0.017453292519943295; // Math.PI / 180
    var c = cos;
    var a = 0.5 - c((lat2 - lat1) * p)/2 + 
           c(lat1 * p) * c(lat2 * p) * 
           (1 - c((lon2 - lon1) * p))/2;
    return 12742 * asin(sqrt(a)); // 2 * R; R = 6371 km
  }

  double _getRoomLatitude(Room room) {
    if (room.latitude != null) return room.latitude!;
    if (room.city.toLowerCase() == 'bangalore') return 12.9716;
    if (room.city.toLowerCase() == 'delhi') return 28.6921;
    if (room.city.toLowerCase() == 'hyderabad') return 17.4065;
    return 12.9716;
  }

  double _getRoomLongitude(Room room) {
    if (room.longitude != null) return room.longitude!;
    if (room.city.toLowerCase() == 'bangalore') return 77.5946;
    if (room.city.toLowerCase() == 'delhi') return 77.2090;
    if (room.city.toLowerCase() == 'hyderabad') return 78.4772;
    return 77.5946;
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

  Widget _buildTrustBanner() {
    final isVerified = _currentUser.verified;
    return Card(
      color: Theme.of(context).colorScheme.primary.withOpacity(0.08),
      child: InkWell(
        onTap: isVerified ? null : _showVerificationSheet,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.2),
                child: Icon(
                  isVerified ? Icons.verified_rounded : Icons.pending_actions_rounded,
                  color: isVerified ? Colors.blueAccent : Colors.amber,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          isVerified ? 'Verified Student Profile' : 'Pending KYC Verification',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        if (isVerified) ...[
                          const SizedBox(width: 6),
                          const Icon(Icons.verified, color: Colors.blueAccent, size: 16),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      isVerified 
                          ? 'Your Aadhaar is verified. Trust Index Score: ${_currentUser.trustScore}'
                          : 'Tap here to upload student/ID card & earn CampusStay Trust Badge.',
                      style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6)),
                    ),
                  ],
                ),
              ),
              if (!isVerified) ...[
                const SizedBox(width: 8),
                Icon(Icons.chevron_right_rounded, color: Theme.of(context).primaryColor),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFeedView(SupabaseService db) {
    final userLat = _currentPosition?.latitude ?? 12.9716;
    final userLng = _currentPosition?.longitude ?? 77.5946;

    final headerAndSearch = [
      _buildTrustBanner(),
      const SizedBox(height: 20),
      SearchBar(
        hintText: 'Search city (e.g. Bangalore, Delhi, Hyderabad)',
        leading: const Icon(Icons.search),
        onChanged: (val) {
          setState(() {
            _searchCity = val;
          });
        },
      ),
      const SizedBox(height: 20),
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Nearby Accommodations',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              if (_loadingLocation)
                const Text('Updating your exact location...', style: TextStyle(fontSize: 11, color: Colors.grey))
              else if (_currentPosition != null)
                Text('Sorted by proximity to your coordinates (${userLat.toStringAsFixed(4)}, ${userLng.toStringAsFixed(4)})', style: const TextStyle(fontSize: 11, color: Colors.grey))
              else
                const Text('Using default city center location (GPS disabled)', style: TextStyle(fontSize: 11, color: Colors.grey)),
            ],
          ),
          Row(
            children: [
              IconButton(
                icon: Icon(_showMapView ? Icons.list_rounded : Icons.map_rounded),
                color: Theme.of(context).primaryColor,
                tooltip: _showMapView ? 'Switch to List View' : 'Switch to Map View',
                onPressed: () {
                  setState(() {
                    _showMapView = !_showMapView;
                  });
                },
              ),
              if (_comparisonList.isNotEmpty) ...[
                const SizedBox(width: 8),
                TextButton.icon(
                  onPressed: _showComparisonSheet,
                  icon: const Icon(Icons.compare_arrows_rounded),
                  label: Text('Compare (${_comparisonList.length})'),
                ),
              ],
            ],
          ),
        ],
      ),
      const SizedBox(height: 12),
    ];

    if (_showMapView) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ...headerAndSearch,
            Expanded(
              child: StreamBuilder<List<Room>>(
                stream: db.streamRooms(city: _searchCity),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  final rooms = snapshot.data ?? [];

                  if (rooms.isEmpty) {
                    return const Center(
                      child: Text('No real-time accommodations registered in Supabase database.'),
                    );
                  }

                  if (_selectedMapRoom != null && !rooms.any((r) => r.id == _selectedMapRoom!.id)) {
                    _selectedMapRoom = null;
                  }

                  final centerPos = LatLng(userLat, userLng);

                  return Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white10),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: FlutterMap(
                            options: MapOptions(
                              initialCenter: centerPos,
                              initialZoom: 12.0,
                            ),
                            children: [
                              TileLayer(
                                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                                userAgentPackageName: 'com.campusstay.app',
                              ),
                              MarkerLayer(
                                markers: [
                                  Marker(
                                    point: centerPos,
                                    width: 45,
                                    height: 45,
                                    child: const Icon(
                                      Icons.person_pin_circle,
                                      color: Colors.blueAccent,
                                      size: 45,
                                    ),
                                  ),
                                  ...rooms.map((room) {
                                    final rLat = _getRoomLatitude(room);
                                    final rLng = _getRoomLongitude(room);
                                    final isSelected = _selectedMapRoom?.id == room.id;
                                    return Marker(
                                      point: LatLng(rLat, rLng),
                                      width: 80,
                                      height: 35,
                                      child: GestureDetector(
                                        onTap: () {
                                          setState(() {
                                            _selectedMapRoom = room;
                                          });
                                        },
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: isSelected 
                                                ? Colors.black 
                                                : Theme.of(context).primaryColor,
                                            borderRadius: BorderRadius.circular(12),
                                            border: Border.all(color: Colors.white, width: 2),
                                            boxShadow: const [
                                              BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2)),
                                            ],
                                          ),
                                          child: Center(
                                            child: Text(
                                              '₹${(room.rent / 1000).toStringAsFixed(1)}k',
                                              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                                            ),
                                          ),
                                        ),
                                      ),
                                    );
                                  }),
                                ],
                              ),
                            ],
                          ),
                        ),
                        if (_selectedMapRoom != null)
                          Positioned(
                            bottom: 16,
                            left: 16,
                            right: 16,
                            child: Card(
                              clipBehavior: Clip.antiAlias,
                              elevation: 8,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              child: InkWell(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => RoomDetailScreen(
                                        room: _selectedMapRoom!,
                                        currentStudent: widget.user,
                                        studentLatitude: userLat,
                                        studentLongitude: userLng,
                                      ),
                                    ),
                                  );
                                },
                                child: Container(
                                  height: 100,
                                  color: Theme.of(context).cardColor,
                                  padding: const EdgeInsets.all(12),
                                  child: Row(
                                    children: [
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(8),
                                        child: _selectedMapRoom!.images.isNotEmpty
                                            ? _buildRoomImage(_selectedMapRoom!.images.first, width: 80, height: 80)
                                            : Container(color: Colors.white10, width: 80, height: 80, child: const Icon(Icons.image)),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Text(
                                              _selectedMapRoom!.title,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              '₹${_selectedMapRoom!.rent}/mo • ${_selectedMapRoom!.city}',
                                              style: TextStyle(color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold, fontSize: 12),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              '${_getDistanceInKm(userLat, userLng, _getRoomLatitude(_selectedMapRoom!), _getRoomLongitude(_selectedMapRoom!)).toStringAsFixed(1)} km away',
                                              style: const TextStyle(color: Colors.grey, fontSize: 11),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Icon(Icons.arrow_forward_ios_rounded, size: 16, color: Colors.grey.shade400),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ...headerAndSearch,
          StreamBuilder<List<Room>>(
            stream: db.streamRooms(city: _searchCity),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40.0),
                    child: CircularProgressIndicator(),
                  ),
                );
              }

              final rooms = snapshot.data ?? [];

              if (rooms.isEmpty) {
                return const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40.0),
                    child: Text('No real-time accommodations registered in Supabase database.'),
                  ),
                );
              }

              // Sort rooms by proximity to the student
              rooms.sort((a, b) {
                final distA = _getDistanceInKm(userLat, userLng, _getRoomLatitude(a), _getRoomLongitude(a));
                final distB = _getDistanceInKm(userLat, userLng, _getRoomLatitude(b), _getRoomLongitude(b));
                return distA.compareTo(distB);
              });

              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 1,
                  mainAxisSpacing: 16,
                  childAspectRatio: 1.3,
                ),
                itemCount: rooms.length,
                itemBuilder: (context, idx) {
                  final room = rooms[idx];
                  final isCompared = _comparisonList.contains(room);
                  
                  final roomLat = _getRoomLatitude(room);
                  final roomLng = _getRoomLongitude(room);
                  final distance = _getDistanceInKm(userLat, userLng, roomLat, roomLng);
                  final distanceText = distance < 1.0 
                      ? '${(distance * 1000).toStringAsFixed(0)} m away' 
                      : '${distance.toStringAsFixed(1)} km away';

                  return Card(
                    clipBehavior: Clip.antiAlias,
                    child: InkWell(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => RoomDetailScreen(
                              room: room,
                              currentStudent: widget.user,
                              studentLatitude: userLat,
                              studentLongitude: userLng,
                            ),
                          ),
                        );
                      },
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Stack(
                              children: [
                                room.images.isNotEmpty
                                    ? _buildRoomImage(room.images.first, width: double.infinity, fit: BoxFit.cover)
                                    : Container(
                                        color: Colors.grey.shade200,
                                        child: const Center(
                                          child: Icon(Icons.image, size: 50, color: Colors.grey),
                                        ),
                                      ),
                                Positioned(
                                  top: 10,
                                  right: 10,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: Colors.black87,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.star_rounded, color: Colors.amber, size: 16),
                                        const SizedBox(width: 4),
                                        Text('${room.rating}', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ),
                                ),
                                Positioned(
                                  top: 10,
                                  left: 10,
                                  child: IconButton(
                                    style: IconButton.styleFrom(backgroundColor: Colors.black87),
                                    icon: Icon(
                                      isCompared ? Icons.check_circle_rounded : Icons.compare_arrows_rounded,
                                      color: isCompared ? Colors.greenAccent : Colors.white,
                                    ),
                                    onPressed: () {
                                      setState(() {
                                        if (isCompared) {
                                          _comparisonList.remove(room);
                                        } else {
                                          if (_comparisonList.length < 3) {
                                            _comparisonList.add(room);
                                          } else {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              const SnackBar(content: Text('Compare limit is 3 properties.')),
                                            );
                                          }
                                        }
                                      });
                                    },
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        room.title,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '📍 ${room.detailedAddress}',
                                        style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5)),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 4),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: Theme.of(context).primaryColor.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          distanceText,
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: Theme.of(context).primaryColor,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      '₹${room.rent}/mo',
                                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Theme.of(context).primaryColor),
                                    ),
                                    const Text('Postgres Verified', style: TextStyle(fontSize: 10, color: Colors.grey)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }

  void _showComparisonSheet() {
    final userLat = _currentPosition?.latitude ?? 12.9716;
    final userLng = _currentPosition?.longitude ?? 77.5946;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(24),
          height: MediaQuery.of(context).size.height * 0.75,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Property Match Comparison', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: SingleChildScrollView(
                  child: Table(
                    columnWidths: {
                      0: const FlexColumnWidth(1.2), // Spec Label Column
                      for (int i = 0; i < _comparisonList.length; i++)
                        (i + 1): const FlexColumnWidth(1.0),
                    },
                    defaultVerticalAlignment: TableCellVerticalAlignment.middle,
                    border: const TableBorder(
                      horizontalInside: BorderSide(color: Colors.white10, width: 1),
                    ),
                    children: [
                      // Row 0: Images
                      TableRow(
                        children: [
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12.0),
                            child: Text('Property', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
                          ),
                          ..._comparisonList.map((room) => Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4.0, vertical: 8.0),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Image.network(
                                room.images.isNotEmpty ? room.images.first : '',
                                height: 70,
                                fit: BoxFit.cover,
                                errorBuilder: (c, e, s) => Container(color: Colors.white10, height: 70, child: const Icon(Icons.image)),
                              ),
                            ),
                          )),
                        ],
                      ),
                      // Row 1: Title
                      TableRow(
                        children: [
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12.0),
                            child: Text('Title', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
                          ),
                          ..._comparisonList.map((room) => Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Text(room.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12), maxLines: 2, overflow: TextOverflow.ellipsis),
                          )),
                        ],
                      ),
                      // Row 2: Rent
                      TableRow(
                        children: [
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12.0),
                            child: Text('Rent / mo', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
                          ),
                          ..._comparisonList.map((room) => Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Text('₹${room.rent}', style: TextStyle(color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold, fontSize: 13)),
                          )),
                        ],
                      ),
                      // Row 3: Rating
                      TableRow(
                        children: [
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12.0),
                            child: Text('Rating', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
                          ),
                          ..._comparisonList.map((room) => Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Row(
                              children: [
                                const Icon(Icons.star_rounded, color: Colors.amber, size: 14),
                                const SizedBox(width: 4),
                                Text('${room.rating}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          )),
                        ],
                      ),
                      // Row 4: Location
                      TableRow(
                        children: [
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12.0),
                            child: Text('City', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
                          ),
                          ..._comparisonList.map((room) => Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Text(room.city, style: const TextStyle(fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
                          )),
                        ],
                      ),
                      // Row 5: Amenities summary
                      TableRow(
                        children: [
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12.0),
                            child: Text('Amenities', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
                          ),
                          ..._comparisonList.map((room) {
                            final text = room.amenities.join(', ');
                            return Padding(
                              padding: const EdgeInsets.all(8.0),
                              child: Text(
                                text.isEmpty ? 'None' : text,
                                style: const TextStyle(fontSize: 11, color: Colors.grey),
                                maxLines: 3,
                                overflow: TextOverflow.ellipsis,
                              ),
                            );
                          }),
                        ],
                      ),
                      // Row 6: Details Router Link Button
                      TableRow(
                        children: [
                          const SizedBox(),
                          ..._comparisonList.map((room) => Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4.0, vertical: 12.0),
                            child: SizedBox(
                              height: 32,
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                  backgroundColor: Theme.of(context).primaryColor,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                onPressed: () {
                                  Navigator.pop(context);
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => RoomDetailScreen(
                                        room: room,
                                        currentStudent: widget.user,
                                        studentLatitude: userLat,
                                        studentLongitude: userLng,
                                      ),
                                    ),
                                  );
                                },
                                child: const Text('View', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                              ),
                            ),
                          )),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    setState(() {
                      _comparisonList.clear();
                    });
                    Navigator.pop(context);
                  },
                  child: const Text('Clear Comparison List', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }



  String _getMonthName(int month) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (month >= 1 && month <= 12) return months[month - 1];
    return 'June';
  }

  Widget _buildMyRoomView(SupabaseService db, PaymentService payment) {
    return StreamBuilder<List<Booking>>(
      stream: db.streamBookings(widget.user.uid, false),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        final bookings = snapshot.data ?? [];
        final activeBooking = bookings.firstWhere(
          (b) => b.status == 'Active' || b.status == 'Confirmed',
          orElse: () => bookings.isNotEmpty ? bookings.first : Booking(
            id: '', studentId: '', roomId: '', ownerId: '', status: 'None', 
            moveInDate: DateTime.now(), rentalAgreementUrl: '', rent: 0
          ),
        );

        if (activeBooking.status == 'None' || bookings.isEmpty) {
          return Scaffold(
            appBar: AppBar(title: const Text('My Room')),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(40.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.home_work_outlined, size: 60, color: Colors.grey.shade400),
                    const SizedBox(height: 16),
                    const Text(
                      'No active room booked yet.',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.grey),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Go to the Rent Feed tab to find and book your ideal accommodation!',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        if (activeBooking.status == 'Requested') {
          return Scaffold(
            appBar: AppBar(title: const Text('My Room (Pending Deposit)')),
            body: Center(
              child: Card(
                margin: const EdgeInsets.all(24),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.warning_amber_rounded, size: 60, color: Colors.amber),
                      const SizedBox(height: 16),
                      const Text(
                        'Deposit Payment Required',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Your booking request for the room is pending. Please pay the security deposit of ₹${activeBooking.rent} to secure your room.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 13, color: Colors.black54),
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _processingPayment ? null : () async {
                            setState(() {
                              _processingPayment = true;
                            });
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Initializing Secure Razorpay Gateway...')));
                            final success = await payment.triggerRazorpayPayment(activeBooking.id, activeBooking.rent, widget.user.uid);
                            setState(() {
                              _processingPayment = false;
                            });
                            if (success) {
                              if (context.mounted) {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => PaymentSuccessScreen(
                                      bookingId: activeBooking.id,
                                      amount: activeBooking.rent,
                                      transactionId: 'pay_${DateTime.now().millisecondsSinceEpoch}',
                                    ),
                                  ),
                                );
                              }
                            } else {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment failed or cancelled.')),);
                              }
                            }
                          },
                          child: _processingPayment 
                              ? const SizedBox(
                                  width: 18, 
                                  height: 18, 
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                                )
                              : const Text('Pay Booking Deposit (Razorpay)', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }

        // Active / Confirmed booking -> render the RoomExpensesScreen directly!
        return RoomExpensesScreen(
          roomId: activeBooking.roomId,
          currentUser: widget.user,
          bookingId: activeBooking.id,
        );
      },
    );
  }

  Widget _buildTicketsView(SupabaseService db) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => TicketSystemScreen(studentId: widget.user.uid)),
                );
              },
              icon: const Icon(Icons.add),
              label: const Text('Submit New Maintenance Ticket'),
            ),
          ),
        ),
        Expanded(
          child: StreamBuilder<List<MaintenanceTicket>>(
            stream: db.streamTickets(widget.user.uid, false),
            builder: (context, snapshot) {
              final tickets = snapshot.data ?? [];
              
              if (tickets.isEmpty) {
                return const Center(child: Text('No maintenance issues logged. System nominal.'));
              }

              return ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: tickets.length,
                itemBuilder: (context, idx) {
                  final t = tickets[idx];
                  return Card(
                    child: ListTile(
                      title: Text(t.issue),
                      subtitle: Text('SLA Target: 24h • Status: ${t.status}'),
                      trailing: Icon(
                        t.status == 'Resolved' ? Icons.check_circle : Icons.warning_amber_rounded,
                        color: t.status == 'Resolved' ? Colors.greenAccent : 
                               t.status == 'Escalated' ? Colors.redAccent : Colors.amber,
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildProfileView(AuthService authService) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Trust Badge & Avatar
          Center(
            child: Column(
              children: [
                Stack(
                  children: [
                    CircleAvatar(
                      radius: 50,
                      backgroundImage: NetworkImage(_profilePic),
                      backgroundColor: Colors.grey.shade200,
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: GestureDetector(
                        onTap: () => _pickAndUploadPhoto(authService),
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: Theme.of(context).primaryColor,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                          child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 16),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                
                // Predefined Avatars row
                const Text(
                  'Choose Avatar or Upload Custom Photo',
                  style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: _predefinedAvatars.map((url) {
                      final isSelected = _profilePic == url;
                      return GestureDetector(
                        onTap: () {
                          setState(() {
                            _profilePic = url;
                          });
                        },
                        child: Container(
                          margin: const EdgeInsets.symmetric(horizontal: 6),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: isSelected ? Theme.of(context).primaryColor : Colors.transparent,
                              width: 3,
                            ),
                          ),
                          child: CircleAvatar(
                            radius: 20,
                            backgroundImage: NetworkImage(url),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 16),
                
                Text(
                  _currentUser.email,
                  style: const TextStyle(color: Colors.grey, fontSize: 14),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  decoration: BoxDecoration(
                    color: Theme.of(context).primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: InkWell(
                    onTap: _currentUser.verified ? null : _showVerificationSheet,
                    borderRadius: BorderRadius.circular(20),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _currentUser.verified ? Icons.verified_user_rounded : Icons.gpp_maybe_rounded,
                            color: _currentUser.verified ? Theme.of(context).primaryColor : Colors.amber,
                            size: 18,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _currentUser.verified 
                                ? 'Verified (Score: ${_currentUser.trustScore})' 
                                : 'Verify Now (Score: ${_currentUser.trustScore})',
                            style: TextStyle(
                              color: _currentUser.verified ? Theme.of(context).primaryColor : Colors.amber,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          const Text('Personal Information', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          TextFormField(
            controller: _usernameController,
            decoration: const InputDecoration(
              labelText: 'Unique Username',
              prefixIcon: Icon(Icons.alternate_email_rounded),
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _nameController,
            decoration: const InputDecoration(
              labelText: 'Full Name',
              prefixIcon: Icon(Icons.person_outline_rounded),
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Phone Number',
              prefixIcon: Icon(Icons.phone_iphone_rounded),
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 32),

          // Save Profile Button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: _profileSaving ? null : () => _saveProfile(authService),
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).primaryColor,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _profileSaving 
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Save Profile Updates', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
          const SizedBox(height: 32),

          const Divider(height: 40),
          const Text('Rent & Payments', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),

          // Active Bookings & Due Rent Stream
          StreamBuilder<List<Booking>>(
            stream: Provider.of<SupabaseService>(context, listen: false).streamBookings(widget.user.uid, false),
            builder: (context, bookingSnapshot) {
              if (bookingSnapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              final bookings = bookingSnapshot.data ?? [];
              final activeBookings = bookings.where((b) => b.status == 'Active').toList();

              if (activeBookings.isEmpty) {
                return Card(
                  color: Colors.amber.shade50.withOpacity(0.3),
                  shape: RoundedRectangleBorder(
                    side: BorderSide(color: Colors.amber.shade200, width: 1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Padding(
                    padding: EdgeInsets.all(16.0),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline, color: Colors.amber),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'No active bookings or monthly rent currently due. Browse properties to get started!',
                            style: TextStyle(fontSize: 13, color: Colors.black87),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }

              final activeBooking = activeBookings.first;

              // Check if payment was already made for this booking (simulated check)
              return StreamBuilder<List<Map<String, dynamic>>>(
                stream: Provider.of<PaymentService>(context, listen: false).streamPayments(widget.user.uid),
                builder: (context, paymentSnapshot) {
                  final payments = paymentSnapshot.data ?? [];
                  
                  // Check if there is a payment in this calendar month
                  final now = DateTime.now();
                  final rentPaidThisMonth = payments.any((p) {
                    if (p['booking_id'] != activeBooking.id) return false;
                    if (p['status'] != 'Successful') return false;
                    final receipt = p['receipt']?.toString();
                    if (receipt == null) return false;
                    
                    // Must be a rent payment (matches format 'Monthly Rent - [Month] [Year]') and NOT landlord bill
                    if (!receipt.contains('Monthly Rent')) return false;

                    final dateStr = p['created_at'] as String?;
                    if (dateStr == null) return false;
                    final pDate = DateTime.tryParse(dateStr);
                    if (pDate == null) return false;
                    return pDate.year == now.year && pDate.month == now.month;
                  });

                  return Card(
                    elevation: 3,
                    shape: RoundedRectangleBorder(
                      side: BorderSide(color: Colors.grey.shade200),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(20.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('MONTHLY RENT DUE', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey, fontSize: 11, letterSpacing: 1.0)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: rentPaidThisMonth ? Colors.green.withOpacity(0.15) : Colors.orange.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(30),
                                ),
                                child: Text(
                                  rentPaidThisMonth ? 'PAID' : 'DUE',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: rentPaidThisMonth ? Colors.green.shade800 : Colors.orange.shade800,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            '₹${activeBooking.rent} / month',
                            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Rent due date: 5th of this month',
                            style: TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                          const SizedBox(height: 16),
                          if (!rentPaidThisMonth) ...[
                            SizedBox(
                              width: double.infinity,
                              height: 46,
                              child: ElevatedButton.icon(
                                onPressed: () {
                                  showModalBottomSheet(
                                    context: context,
                                    isScrollControlled: true,
                                    backgroundColor: Colors.transparent,
                                    builder: (sheetCtx) {
                                      return RazorpayCheckoutSheet(
                                        amount: activeBooking.rent,
                                        bookingId: activeBooking.id,
                                        studentId: widget.user.uid,
                                        paymentService: Provider.of<PaymentService>(context, listen: false),
                                        onPaymentSuccess: (txId) async {
                                          final client = Supabase.instance.client;
                                          try {
                                            await client.from('payments').update({
                                              'receipt': 'Monthly Rent - ${_getMonthName(DateTime.now().month)} ${DateTime.now().year}',
                                            }).eq('razorpay_id', txId);
                                          } catch (e) {
                                            debugPrint("Failed to update rent receipt: $e");
                                          }
                                          if (context.mounted) {
                                            Navigator.push(
                                              context,
                                              MaterialPageRoute(
                                                builder: (_) => PaymentSuccessScreen(
                                                  bookingId: activeBooking.id,
                                                  amount: activeBooking.rent,
                                                  transactionId: txId,
                                                ),
                                              ),
                                            );
                                          }
                                        },
                                      );
                                    },
                                  );
                                },
                                icon: const Icon(Icons.payment, size: 18),
                                label: const Text('Pay Monthly Rent (Razorpay)'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Theme.of(context).primaryColor,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                              ),
                            ),
                          ] else ...[
                            const Row(
                              children: [
                                Icon(Icons.check_circle_rounded, color: Colors.green, size: 18),
                                SizedBox(width: 8),
                                Text(
                                  'Rent paid for this month. Thank you!',
                                  style: TextStyle(fontSize: 13, color: Colors.green, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                },
              );
            },
          ),
          const SizedBox(height: 24),

          // Transaction History list
          const Text('Transaction History', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),

          StreamBuilder<List<Map<String, dynamic>>>(
            stream: Provider.of<PaymentService>(context, listen: false).streamPayments(widget.user.uid),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              final payments = snapshot.data ?? [];

              if (payments.isEmpty) {
                return Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: const Center(
                    child: Text(
                      'No transaction history found.',
                      style: TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                  ),
                );
              }

              return ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: payments.length,
                itemBuilder: (context, idx) {
                  final p = payments[idx];
                  final timestamp = DateTime.tryParse(p['created_at'] ?? '') ?? DateTime.now();
                  final dateFormatted = "${timestamp.day}/${timestamp.month}/${timestamp.year}";

                  return Card(
                    margin: const EdgeInsets.symmetric(vertical: 6),
                    elevation: 1,
                    child: ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(Icons.receipt_long_rounded, color: Colors.green.shade700, size: 20),
                      ),
                      title: Text(
                        '₹${p['amount']} paid via ${p['method']}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      subtitle: Text(
                        'Date: $dateFormatted • ID: ${p['razorpay_id']}',
                        style: const TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                      trailing: IconButton(
                        icon: const Icon(Icons.info_outline, size: 20),
                        onPressed: () => _showReceiptDialog(context, p),
                      ),
                    ),
                  );
                },
              );
            },
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: OutlinedButton.icon(
              onPressed: () {
                Provider.of<AuthService>(context, listen: false).signOut();
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (_) => LoginSelectionScreen()),
                  (route) => false,
                );
              },
              icon: const Icon(Icons.logout, color: Colors.red),
              label: const Text('Logout Session', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Colors.red, width: 1.5),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  void _saveProfile(AuthService authService) async {
    final usernameText = _usernameController.text.trim();
    if (usernameText.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Username cannot be empty!')),
      );
      return;
    }
    if (usernameText.contains(' ')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Username cannot contain spaces!')),
      );
      return;
    }

    setState(() {
      _profileSaving = true;
    });

    final updatedPreferences = UserPreferences(
      budgetMin: _budgetMin,
      budgetMax: _budgetMax,
      sleepHabit: _sleepHabit,
      cleanliness: _cleanliness,
      dietary: _dietary,
      socialStatus: _socialStatus,
    );

    final updatedUser = CSUser(
      uid: _currentUser.uid,
      name: _nameController.text.trim(),
      email: _currentUser.email,
      phone: _phoneController.text.trim(),
      role: _currentUser.role,
      profilePic: _profilePic,
      verified: _currentUser.verified,
      verificationDocs: _currentUser.verificationDocs,
      trustScore: _currentUser.trustScore,
      joinedDate: _currentUser.joinedDate,
      preferences: updatedPreferences,
      username: _usernameController.text.trim(),
      blocked: _currentUser.blocked,
    );

    try {
      await authService.updateUserProfile(updatedUser);
      setState(() {
        _currentUser = updatedUser;
        _profileSaving = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated successfully in Supabase!')),
        );
      }
    } catch (e) {
      setState(() {
        _profileSaving = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update profile: ${e.toString().contains('unique') ? 'Username already taken!' : e}')),
        );
      }
    }
  }

  void _showReceiptDialog(BuildContext context, Map<String, dynamic> payment) {
    final timestamp = DateTime.tryParse(payment['created_at'] ?? '') ?? DateTime.now();
    final dateFormatted = "${timestamp.day}/${timestamp.month}/${timestamp.year}";
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.receipt, color: Colors.green),
              SizedBox(width: 8),
              Text('Transaction Receipt', style: TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildReceiptRow('Transaction ID', payment['razorpay_id'] ?? 'N/A'),
              const Divider(),
              _buildReceiptRow('Booking ID', payment['booking_id'] ?? 'N/A'),
              const Divider(),
              _buildReceiptRow('Payment Method', payment['method'] ?? 'N/A'),
              const Divider(),
              _buildReceiptRow('Status', payment['status'] ?? 'N/A', isSuccess: payment['status'] == 'Successful'),
              const Divider(),
              _buildReceiptRow('Date & Time', dateFormatted),
              const Divider(),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Amount Paid', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    Text(
                      '₹${payment['amount']}',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                        color: Theme.of(context).primaryColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildReceiptRow(String label, String value, {bool isSuccess = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 12,
                color: isSuccess ? Colors.green : Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showVerificationSheet() {
    final authService = Provider.of<AuthService>(context, listen: false);
    String selectedDocType = 'Aadhaar Card';
    Uint8List? frontBytes;
    Uint8List? backBytes;
    bool isProcessing = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Container(
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 24,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 5,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade600,
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Row(
                    children: [
                      Icon(Icons.shield_rounded, color: Colors.blueAccent, size: 24),
                      SizedBox(width: 8),
                      Text(
                        'Student Identity KYC Portal',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Verify your student credentials or government ID to unlock the campus trust badge and boost your roommate match score.',
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                  const SizedBox(height: 16),
                  
                  const Text('Select Document Type', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    value: selectedDocType,
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'Aadhaar Card', child: Text('Aadhaar Card')),
                      DropdownMenuItem(value: 'Passport', child: Text('Passport')),
                      DropdownMenuItem(value: 'Student ID Card', child: Text('Student ID Card')),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setSheetState(() {
                          selectedDocType = val;
                        });
                      }
                    },
                  ),
                  const SizedBox(height: 16),

                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Front Side', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                            const SizedBox(height: 6),
                            GestureDetector(
                              onTap: () async {
                                final picker = ImagePicker();
                                final file = await picker.pickImage(source: ImageSource.camera, imageQuality: 70);
                                if (file != null) {
                                  final bytes = await file.readAsBytes();
                                  setSheetState(() {
                                    frontBytes = bytes;
                                  });
                                }
                              },
                              child: Container(
                                height: 110,
                                decoration: BoxDecoration(
                                  color: Colors.grey.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.grey.withOpacity(0.3)),
                                ),
                                child: frontBytes == null
                                    ? const Center(
                                        child: Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Icon(Icons.add_a_photo_rounded, color: Colors.grey),
                                            SizedBox(height: 4),
                                            Text('Capture Front', style: TextStyle(fontSize: 11, color: Colors.grey)),
                                          ],
                                        ),
                                      )
                                    : ClipRRect(
                                        borderRadius: BorderRadius.circular(11),
                                        child: Image.memory(frontBytes!, fit: BoxFit.cover, width: double.infinity),
                                      ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Back Side', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                            const SizedBox(height: 6),
                            GestureDetector(
                              onTap: () async {
                                final picker = ImagePicker();
                                final file = await picker.pickImage(source: ImageSource.camera, imageQuality: 70);
                                if (file != null) {
                                  final bytes = await file.readAsBytes();
                                  setSheetState(() {
                                    backBytes = bytes;
                                  });
                                }
                              },
                              child: Container(
                                height: 110,
                                decoration: BoxDecoration(
                                  color: Colors.grey.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.grey.withOpacity(0.3)),
                                ),
                                child: backBytes == null
                                    ? const Center(
                                        child: Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Icon(Icons.add_a_photo_rounded, color: Colors.grey),
                                            SizedBox(height: 4),
                                            Text('Capture Back', style: TextStyle(fontSize: 11, color: Colors.grey)),
                                          ],
                                        ),
                                      )
                                    : ClipRRect(
                                        borderRadius: BorderRadius.circular(11),
                                        child: Image.memory(backBytes!, fit: BoxFit.cover, width: double.infinity),
                                      ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: (frontBytes == null || backBytes == null || isProcessing)
                          ? null
                          : () async {
                              setSheetState(() {
                                isProcessing = true;
                              });

                              final scanResult = await Navigator.push<bool>(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => Scaffold(
                                    body: CameraScanOverlay(
                                      imageBytes: frontBytes!,
                                      onComplete: () {
                                        Navigator.pop(context, true);
                                      },
                                    ),
                                  ),
                                ),
                              );

                              if (scanResult == true) {
                                try {
                                  final frontUrl = await authService.uploadVerificationDoc(
                                    _currentUser.uid,
                                    '${selectedDocType.replaceAll(' ', '_')}_front',
                                    frontBytes!,
                                  );
                                  final backUrl = await authService.uploadVerificationDoc(
                                    _currentUser.uid,
                                    '${selectedDocType.replaceAll(' ', '_')}_back',
                                    backBytes!,
                                  );

                                  final updatedDocs = List<String>.from(_currentUser.verificationDocs)
                                    ..add(frontUrl)
                                    ..add(backUrl);

                                  final updatedUser = CSUser(
                                    uid: _currentUser.uid,
                                    name: _currentUser.name,
                                    email: _currentUser.email,
                                    phone: _currentUser.phone,
                                    role: _currentUser.role,
                                    profilePic: _currentUser.profilePic,
                                    verified: false, // Remains false until Admin verifies and approves
                                    verificationDocs: updatedDocs,
                                    trustScore: _currentUser.trustScore,
                                    joinedDate: _currentUser.joinedDate,
                                    preferences: _currentUser.preferences,
                                    username: _currentUser.username,
                                    blocked: _currentUser.blocked,
                                  );

                                  await authService.updateUserProfile(updatedUser);
                                  
                                  setState(() {
                                    _currentUser = updatedUser;
                                  });

                                  if (context.mounted) {
                                    Navigator.pop(context);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text('Student KYC Documents uploaded! Submitted for Admin Verification & Approval.'),
                                        backgroundColor: Colors.blue,
                                      ),
                                    );
                                  }
                                } catch (e) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Upload/Verification failed: $e')),
                                    );
                                  }
                                }
                              }

                              setSheetState(() {
                                isProcessing = false;
                              });
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).primaryColor,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: isProcessing
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text('Initiate Secure AI ID Scan', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _setupNotificationsListener(SupabaseService db, String userId) {
    _notificationsSubscription?.cancel();
    _notificationsSubscription = db.streamUserNotifications(userId).listen((notifications) {
      if (notifications.isEmpty) return;
      if (_seenNotificationIds.isEmpty) {
        _seenNotificationIds = notifications.map((n) => n['id'].toString()).toSet();
        return;
      }
      for (var n in notifications) {
        final id = n['id'].toString();
        if (n['read'] == false && !_seenNotificationIds.contains(id)) {
          _seenNotificationIds.add(id);
          _showInAppNotification(n);
        }
      }
    });
  }

  void _showInAppNotification(Map<String, dynamic> n) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        backgroundColor: Colors.red.shade900,
        content: Row(
          children: [
            const Icon(Icons.notifications_active, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    n['title'] ?? 'Notification',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    n['message'] ?? '',
                    style: const TextStyle(fontSize: 11),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationIcon(BuildContext context, SupabaseService db) {
    return StreamBuilder<List<Map<String, dynamic>>>(
      stream: db.streamUserNotifications(_currentUser.uid),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          debugPrint("Notifications badge stream error: ${snapshot.error}");
        }
        final notifications = snapshot.data ?? [];
        final unreadCount = notifications.where((n) => n['read'] == false).length;

        return Padding(
          padding: const EdgeInsets.only(right: 8.0),
          child: Badge(
            label: unreadCount > 0 ? Text('$unreadCount') : null,
            isLabelVisible: unreadCount > 0,
            backgroundColor: Colors.red,
            textColor: Colors.white,
            alignment: const Alignment(0.6, -0.6),
            child: IconButton(
              icon: const Icon(Icons.notifications_active_outlined),
              onPressed: () => _showNotificationsBottomSheet(context, db, _currentUser.uid),
            ),
          ),
        );
      },
    );
  }

  void _showNotificationsBottomSheet(BuildContext context, SupabaseService db, String userId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.6,
          maxChildSize: 0.9,
          minChildSize: 0.4,
          expand: false,
          builder: (context, scrollController) {
            return StreamBuilder<List<Map<String, dynamic>>>(
              stream: db.streamUserNotifications(userId),
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Text(
                        'Error loading notifications: ${snapshot.error}',
                        style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  );
                }
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                
                final notifications = snapshot.data ?? [];
                
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Column(
                    children: [
                      Container(
                        width: 40,
                        height: 5,
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Notifications',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                          ),
                          if (notifications.any((n) => n['read'] == false))
                            TextButton(
                              onPressed: () => db.markAllNotificationsAsRead(userId),
                              child: const Text('Mark all as read'),
                            ),
                        ],
                      ),
                      const Divider(),
                      Expanded(
                        child: notifications.isEmpty
                            ? Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.notifications_none_rounded, size: 64, color: Colors.grey.shade300),
                                    const SizedBox(height: 12),
                                    Text('No notifications yet', style: TextStyle(color: Colors.grey.shade500)),
                                  ],
                                ),
                              )
                            : ListView.builder(
                                controller: scrollController,
                                itemCount: notifications.length,
                                itemBuilder: (context, idx) {
                                  final n = notifications[idx];
                                  final isUnread = n['read'] == false;
                                  final type = n['type'] ?? 'system';
                                  
                                  IconData icon = Icons.info_outline;
                                  Color color = Colors.blue;
                                  if (type == 'billing') {
                                    icon = Icons.receipt_long_rounded;
                                    color = Colors.green;
                                  } else if (type == 'sla_breach') {
                                    icon = Icons.warning_amber_rounded;
                                    color = Colors.red;
                                  } else if (type == 'booking') {
                                    icon = Icons.calendar_month_rounded;
                                    color = Colors.orange;
                                  }
                                  
                                  return Card(
                                    color: isUnread ? Theme.of(context).primaryColor.withOpacity(0.04) : Colors.white,
                                    margin: const EdgeInsets.symmetric(vertical: 4),
                                    child: ListTile(
                                      leading: CircleAvatar(
                                        backgroundColor: color.withOpacity(0.1),
                                        child: Icon(icon, color: color),
                                      ),
                                      title: Text(
                                        n['title'] ?? '',
                                        style: TextStyle(
                                          fontWeight: isUnread ? FontWeight.bold : FontWeight.normal,
                                          fontSize: 14,
                                        ),
                                      ),
                                      subtitle: Text(
                                        n['message'] ?? '',
                                        style: const TextStyle(fontSize: 12),
                                      ),
                                      trailing: isUnread
                                          ? Container(
                                              width: 8,
                                              height: 8,
                                              decoration: BoxDecoration(
                                                color: Theme.of(context).primaryColor,
                                                shape: BoxShape.circle,
                                              ),
                                            )
                                          : null,
                                      onTap: () {
                                        if (isUnread) {
                                          db.markNotificationAsRead(n['id'].toString());
                                        }
                                      },
                                    ),
                                  );
                                },
                              ),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  Widget _buildAdminPanelView(SupabaseService db) {
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          Container(
            color: Theme.of(context).cardColor,
            child: TabBar(
              labelColor: Theme.of(context).primaryColor,
              unselectedLabelColor: Colors.grey,
              indicatorColor: Theme.of(context).primaryColor,
              tabs: const [
                Tab(icon: Icon(Icons.verified_user_rounded, size: 18), text: 'KYC Approvals'),
                Tab(icon: Icon(Icons.delete_sweep_rounded, size: 18), text: 'Room Deletions'),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              children: [
                _buildAdminKYCApprovalTab(db),
                _buildAdminRoomDeletionsTab(db),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAdminKYCApprovalTab(SupabaseService db) {
    final client = Supabase.instance.client;
    return StreamBuilder<List<Map<String, dynamic>>>(
      stream: client.from('users').stream(primaryKey: ['id']),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final usersList = snapshot.data ?? [];
        // Filter users who uploaded verification docs
        final kycUsers = usersList.where((u) {
          final docs = List<String>.from(u['verification_docs'] ?? []);
          return docs.isNotEmpty;
        }).toList();

        if (kycUsers.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.shield_rounded, size: 64, color: Colors.grey),
                SizedBox(height: 12),
                Text('No KYC verification submissions pending.', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: kycUsers.length,
          itemBuilder: (context, index) {
            final u = kycUsers[index];
            final String userId = u['id'].toString();
            final String name = u['name'] ?? 'User';
            final String email = u['email'] ?? '';
            final String role = u['role'] ?? 'student';
            final bool isVerified = u['verified'] ?? false;
            final docs = List<String>.from(u['verification_docs'] ?? []);
            final isOwner = role == 'owner';

            return Card(
              margin: const EdgeInsets.only(bottom: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 22,
                          backgroundImage: NetworkImage(u['profile_pic'] ?? 'https://api.dicebear.com/7.x/adventurer/png?seed=$userId'),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: isOwner ? Colors.purple.shade50 : Colors.blue.shade50,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      isOwner ? 'LANDLORD' : 'STUDENT',
                                      style: TextStyle(
                                        color: isOwner ? Colors.purple : Colors.blue,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              Text(email, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: isVerified ? Colors.green.shade50 : Colors.orange.shade50,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: isVerified ? Colors.green : Colors.orange),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                isVerified ? Icons.verified_rounded : Icons.pending_actions_rounded,
                                color: isVerified ? Colors.green : Colors.orange,
                                size: 14,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                isVerified ? 'VERIFIED BADGE' : 'PENDING APPROVAL',
                                style: TextStyle(
                                  color: isVerified ? Colors.green : Colors.orange,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    const Text('Uploaded Identity / Proof Documents:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.grey)),
                    const SizedBox(height: 8),

                    // Documents horizontal scroll preview
                    SizedBox(
                      height: 100,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: docs.length,
                        itemBuilder: (context, dIdx) {
                          final docUrl = docs[dIdx];
                          return Container(
                            margin: const EdgeInsets.only(right: 8),
                            width: 120,
                            decoration: BoxDecoration(
                              color: Colors.grey.shade200,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.grey.shade300),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(
                                docUrl,
                                fit: BoxFit.cover,
                                errorBuilder: (c, e, s) => const Center(child: Icon(Icons.picture_as_pdf_rounded, color: Colors.grey)),
                              ),
                            ),
                          );
                        },
                      ),
                    ),

                    if (isOwner) ...[
                      const SizedBox(height: 12),
                      FutureBuilder(
                        future: client.from('rooms').select('title, city, verified').eq('owner_id', userId),
                        builder: (context, AsyncSnapshot roomSnap) {
                          final rooms = (roomSnap.data as List<dynamic>?) ?? [];
                          if (rooms.isEmpty) return const SizedBox.shrink();
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Associated Room Listings (${rooms.length}):', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.grey)),
                              const SizedBox(height: 4),
                              Wrap(
                                spacing: 6,
                                children: rooms.map((r) => Chip(
                                  avatar: Icon(r['verified'] == true ? Icons.verified_rounded : Icons.home_rounded, size: 14, color: r['verified'] == true ? Colors.green : Colors.grey),
                                  label: Text('${r['title']} (${r['city']})', style: const TextStyle(fontSize: 11)),
                                  visualDensity: VisualDensity.compact,
                                )).toList(),
                              ),
                            ],
                          );
                        },
                      ),
                    ],

                    const SizedBox(height: 16),
                    Row(
                      children: [
                        if (!isVerified) ...[
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () async {
                                try {
                                  // Update User to Verified
                                  await client.from('users').update({
                                    'verified': true,
                                    'trust_score': 98,
                                  }).eq('id', userId);

                                  // If Owner, ALSO verify all owner's rooms!
                                  if (isOwner) {
                                    await client.from('rooms').update({
                                      'verified': true,
                                    }).eq('owner_id', userId);
                                  }

                                  // Send Notification to User
                                  final msg = isOwner
                                      ? "🎉 Congratulations! Your Landlord & Property verification has been approved by Admin. Your profile and room listings now display Verified Badges!"
                                      : "🎉 Congratulations! Your Student KYC verification has been approved by Admin. You now display the Verified Student Badge!";
                                  
                                  await db.createNotification(
                                    userId: userId,
                                    title: "Verification Approved!",
                                    message: msg,
                                  );

                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('${isOwner ? "Landlord & Room Listings" : "Student KYC"} Approved! Verified Badge Issued.'),
                                        backgroundColor: Colors.green,
                                      ),
                                    );
                                  }
                                } catch (e) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Approval failed: $e')),
                                    );
                                  }
                                }
                              },
                              icon: const Icon(Icons.check_circle_rounded),
                              label: Text(isOwner ? 'Approve Owner & Rooms' : 'Approve Student KYC', style: const TextStyle(fontWeight: FontWeight.bold)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.green,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          OutlinedButton.icon(
                            onPressed: () async {
                              try {
                                await client.from('users').update({
                                  'verified': false,
                                }).eq('id', userId);

                                await db.createNotification(
                                  userId: userId,
                                  title: "Verification Rejected",
                                  message: "Your document verification request was rejected. Please re-upload clear government ID documents.",
                                );

                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Verification rejected.')),
                                  );
                                }
                              } catch (e) {
                                debugPrint("Rejection failed: $e");
                              }
                            },
                            icon: const Icon(Icons.cancel_rounded, color: Colors.red),
                            label: const Text('Reject', style: TextStyle(color: Colors.red)),
                            style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.red)),
                          ),
                        ] else ...[
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                try {
                                  await client.from('users').update({'verified': false}).eq('id', userId);
                                  if (isOwner) {
                                    await client.from('rooms').update({'verified': false}).eq('owner_id', userId);
                                  }
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Verification status revoked.')),
                                    );
                                  }
                                } catch (e) {
                                  debugPrint("Revoke error: $e");
                                }
                              },
                              icon: const Icon(Icons.remove_moderator_rounded, color: Colors.orange),
                              label: const Text('Revoke Verified Badge', style: TextStyle(color: Colors.orange)),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildAdminRoomDeletionsTab(SupabaseService db) {

  Widget _buildPendingRequestsList(SupabaseService db, List<Map<String, dynamic>> pending) {
    if (pending.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle_outline_rounded, color: Colors.green, size: 64),
            SizedBox(height: 16),
            Text(
              'No pending deletion requests!',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: pending.length,
      itemBuilder: (context, index) {
        final req = pending[index];
        final requestId = req['id'] as String;
        final roomId = req['room_id'] as String;
        final roomTitle = req['room_title'] as String;
        final roomAddress = req['room_address'] as String;
        final reason = req['reason'] as String;
        final ownerId = req['owner_id'] as String;
        final noteController = TextEditingController();

        return Card(
          margin: const EdgeInsets.only(bottom: 16),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        roomTitle,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.orange.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.orange),
                      ),
                      child: const Text(
                        'Pending',
                        style: TextStyle(color: Colors.orange, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Address: $roomAddress',
                  style: const TextStyle(fontSize: 12, color: Colors.black54),
                ),
                const SizedBox(height: 8),
                FutureBuilder<CSUser?>(
                  future: Provider.of<AuthService>(context, listen: false).fetchUserProfile(ownerId),
                  builder: (context, userSnapshot) {
                    final user = userSnapshot.data;
                    final userName = user?.name ?? 'Loading...';
                    final userEmail = user?.email ?? '';
                    return Text(
                      'Owner: $userName ($userEmail)',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blueGrey),
                    );
                  },
                ),
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Reason for Deletion:',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        reason,
                        style: const TextStyle(fontSize: 13, color: Colors.black87),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: noteController,
                  decoration: const InputDecoration(
                    labelText: 'Admin Note (Optional)',
                    hintText: 'Add an optional note to show to the owner...',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          side: const BorderSide(color: Colors.red),
                        ),
                        onPressed: () async {
                          final adminNote = noteController.text.trim().isNotEmpty
                              ? noteController.text.trim()
                              : 'Request rejected by admin.';
                          await db.rejectDeletionRequest(
                            requestId: requestId,
                            adminNote: adminNote,
                          );
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Deletion request rejected.'), backgroundColor: Colors.orange),
                            );
                          }
                        },
                        icon: const Icon(Icons.close),
                        label: const Text('Reject'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green.shade700,
                          foregroundColor: Colors.white,
                        ),
                        onPressed: () async {
                          final confirmDelete = await showDialog<bool>(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('Confirm Deletion'),
                              content: Text('Are you sure you want to approve deletion and permanently delete "$roomTitle" from the database?'),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.of(context).pop(false),
                                  child: const Text('Cancel'),
                                ),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                                  onPressed: () => Navigator.of(context).pop(true),
                                  child: const Text('Approve & Delete'),
                                ),
                              ],
                            ),
                          );

                          if (confirmDelete == true) {
                            final adminNote = noteController.text.trim().isNotEmpty
                                ? noteController.text.trim()
                                : 'Deletion approved by admin.';
                            await db.approveDeletionRequest(
                              requestId: requestId,
                              roomId: roomId,
                              adminNote: adminNote,
                            );
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Room deleted successfully.'), backgroundColor: Colors.green),
                              );
                            }
                          }
                        },
                        icon: const Icon(Icons.check),
                        label: const Text('Approve'),
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

  Widget _buildProcessedRequestsList(List<Map<String, dynamic>> processed) {
    if (processed.isEmpty) {
      return const Center(
        child: Text('No processed requests yet.'),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: processed.length,
      itemBuilder: (context, index) {
        final req = processed[index];
        final roomTitle = req['room_title'] as String;
        final roomAddress = req['room_address'] as String;
        final status = req['status'] as String;
        final adminNotes = req['admin_notes'] as String?;
        final ownerId = req['owner_id'] as String;

        final isApproved = status == 'approved';

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          color: isApproved ? Colors.green.shade50 : Colors.red.shade50,
          child: ListTile(
            title: Text(roomTitle, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(roomAddress, style: const TextStyle(fontSize: 12)),
                const SizedBox(height: 4),
                FutureBuilder<CSUser?>(
                  future: Provider.of<AuthService>(context, listen: false).fetchUserProfile(ownerId),
                  builder: (context, userSnapshot) {
                    final user = userSnapshot.data;
                    return Text(
                      'Owner: ${user?.name ?? "Loading..."}',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                    );
                  },
                ),
                if (adminNotes != null && adminNotes.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    'Notes: $adminNotes',
                    style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: isApproved ? Colors.green.shade900 : Colors.red.shade900),
                  ),
                ],
              ],
            ),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: isApproved ? Colors.green.withOpacity(0.2) : Colors.red.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isApproved ? Colors.green : Colors.red),
              ),
              child: Text(
                status.toUpperCase(),
                style: TextStyle(
                  color: isApproved ? Colors.green.shade900 : Colors.red.shade900,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final db = Provider.of<SupabaseService>(context, listen: false);
    final payment = Provider.of<PaymentService>(context, listen: false);
    final auth = Provider.of<AuthService>(context, listen: false);

    final isAdmin = _currentUser.role == 'admin';

    final List<BottomNavigationBarItem> navItems = [
      if (isAdmin)
        const BottomNavigationBarItem(icon: Icon(Icons.shield_rounded), label: 'Admin'),
      const BottomNavigationBarItem(icon: Icon(Icons.feed_rounded), label: 'Rent Feed'),
      const BottomNavigationBarItem(icon: Icon(Icons.people_rounded), label: 'Matches'),
      const BottomNavigationBarItem(icon: Icon(Icons.home_work_rounded), label: 'My Room'),
      const BottomNavigationBarItem(icon: Icon(Icons.handyman_rounded), label: 'Tickets'),
      BottomNavigationBarItem(
        icon: StreamBuilder<int>(
          stream: Provider.of<ChatService>(context, listen: false).streamTotalUnreadCount(_currentUser.uid),
          builder: (context, snapshot) {
            final unreadCount = snapshot.data ?? 0;
            return Badge(
              isLabelVisible: unreadCount > 0,
              backgroundColor: Colors.red,
              child: const Icon(Icons.forum_rounded),
            );
          },
        ),
        label: 'Messages',
      ),
      const BottomNavigationBarItem(icon: Icon(Icons.person_rounded), label: 'Profile'),
    ];

    final List<Widget> navBodies = [
      if (isAdmin) _buildAdminPanelView(db),
      _buildFeedView(db),
      RoommateMatchScreen(currentUser: _currentUser),
      _buildMyRoomView(db, payment),
      _buildTicketsView(db),
      ChatsListScreen(currentUserId: _currentUser.uid, currentUserName: _currentUser.name),
      _buildProfileView(auth),
    ];

    final isChatScreen = navBodies[_currentIndex] is ChatsListScreen;
    final hideMainAppBar = isChatScreen || navItems[_currentIndex].label == 'My Room';

    return Scaffold(
      appBar: hideMainAppBar
          ? null
          : AppBar(
              title: const Text('CampusStay Portal'),
              actions: [
                _buildNotificationIcon(context, db),
              ],
            ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        selectedItemColor: Theme.of(context).colorScheme.primary,
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
        onTap: (idx) {
          setState(() {
            _currentIndex = idx;
          });
        },
        items: navItems,
      ),
      body: navBodies[_currentIndex],
    );
  }
}


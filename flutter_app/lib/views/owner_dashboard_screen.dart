import 'dart:io';
import 'dart:convert';
import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/models.dart';
import '../services/services.dart';
import 'login_selection_screen.dart';
import 'camera_scan_overlay.dart';
import 'chats_list_screen.dart';
import 'chat_room_screen.dart';
import 'blocked_screen.dart';

class OwnerDashboardScreen extends StatefulWidget {
  final String userId;
  final String name;
  const OwnerDashboardScreen({
    super.key,
    required this.userId,
    required this.name,
  });

  @override
  State<OwnerDashboardScreen> createState() => _OwnerDashboardScreenState();
}

class _OwnerDashboardScreenState extends State<OwnerDashboardScreen> {
  int _tabIndex = 0;
  late CSUser _currentUser;
  bool _loadingUser = true;
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _usernameController = TextEditingController();
  String _profilePic = '';
  bool _profileSaving = false;

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
    _loadUserProfile();
    
    final authService = Provider.of<AuthService>(context, listen: false);
    _profileSubscription = authService.streamUserProfile(widget.userId).listen((profile) {
      if (profile != null && mounted) {
        setState(() {
          _currentUser = profile;
        });
        if (profile.blocked) {
          _profileSubscription?.cancel();
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (_) => const BlockedScreen()),
            (route) => false,
          );
        }
      }
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final db = Provider.of<SupabaseService>(context, listen: false);
      _setupNotificationsListener(db, widget.userId);
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

  void _loadUserProfile() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    final profile = await authService.fetchUserProfile(widget.userId);
    if (profile != null) {
      setState(() {
        _currentUser = profile;
        _nameController.text = profile.name;
        _phoneController.text = profile.phone;
        _usernameController.text = profile.username;
        _profilePic = profile.profilePic;
        _loadingUser = false;
      });
    } else {
      setState(() {
        _currentUser = CSUser(
          uid: widget.userId,
          name: widget.name,
          email: '',
          phone: '',
          role: 'owner',
          profilePic: 'https://api.dicebear.com/7.x/adventurer/png?seed=${widget.userId}',
          verified: false,
          verificationDocs: [],
          trustScore: 85,
          joinedDate: DateTime.now(),
          preferences: UserPreferences(
            budgetMin: 3000,
            budgetMax: 10000,
            sleepHabit: 'flexible',
            cleanliness: 'medium',
            dietary: 'any',
            socialStatus: 'balanced',
          ),
          username: '',
          blocked: false,
        );
        _nameController.text = widget.name;
        _phoneController.text = '';
        _usernameController.text = '';
        _profilePic = _currentUser.profilePic;
        _loadingUser = false;
      });
    }
  }


  void _showAddRoomDialog(BuildContext context, SupabaseService db) {
    final formKey = GlobalKey<FormState>();
    final titleController = TextEditingController();
    final descController = TextEditingController();
    final cityController = TextEditingController();
    final addressController = TextEditingController();
    final rentController = TextEditingController();
    final depositController = TextEditingController();
    final capacityController = TextEditingController(text: '4');
    final amenitiesController = TextEditingController(text: 'WiFi, AC, Geyser, Laundry');

    XFile? pickedImage;
    bool isUploadingImage = false;
    String? uploadedImageUrl;
    String? uploadError;
    bool isSaving = false;
    String? saveError;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            
            Future<void> pickAndUploadImage() async {
              final picker = ImagePicker();
              final image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
              if (image == null) return;

              setStateDialog(() {
                pickedImage = image;
                isUploadingImage = true;
                uploadError = null;
              });

              try {
                final bytes = await image.readAsBytes();
                final fileName = '${DateTime.now().millisecondsSinceEpoch}_${image.name}';
                final url = await db.uploadRoomImage(fileName, bytes);
                setStateDialog(() {
                  uploadedImageUrl = url;
                  isUploadingImage = false;
                });
              } catch (e) {
                debugPrint("Storage upload failed, fallback to base64: $e");
                try {
                  final bytes = await image.readAsBytes();
                  final base64String = base64Encode(bytes);
                  setStateDialog(() {
                    uploadedImageUrl = 'data:image/jpeg;base64,$base64String';
                    isUploadingImage = false;
                  });
                } catch (err) {
                  setStateDialog(() {
                    isUploadingImage = false;
                    uploadError = "Failed to load image.";
                  });
                }
              }
            }

            Future<Map<String, double>?> geocodeAddress(String query) async {
              try {
                final client = HttpClient();
                final uri = Uri.parse('https://nominatim.openstreetmap.org/search?q=${Uri.encodeComponent(query)}&format=json&limit=1');
                final request = await client.getUrl(uri);
                request.headers.set(HttpHeaders.userAgentHeader, 'RoomMateOwnerApp/1.0');
                final response = await request.close();
                if (response.statusCode == 200) {
                  final body = await response.transform(utf8.decoder).join();
                  final List jsonList = jsonDecode(body);
                  if (jsonList.isNotEmpty) {
                    final lat = double.tryParse(jsonList[0]['lat']?.toString() ?? '');
                    final lon = double.tryParse(jsonList[0]['lon']?.toString() ?? '');
                    if (lat != null && lon != null) {
                      return {'latitude': lat, 'longitude': lon};
                    }
                  }
                }
              } catch (e) {
                debugPrint("Nominatim geocoding failed: $e");
              }
              return null;
            }

            return AlertDialog(
              title: const Text('Add Real-Time Room'),
              content: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (saveError != null) ...[
                        Container(
                          padding: const EdgeInsets.all(8),
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            color: Colors.red.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.redAccent.withValues(alpha: 0.3)),
                          ),
                          child: Text(saveError!, style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
                        ),
                      ],
                      TextFormField(
                        controller: titleController,
                        decoration: const InputDecoration(labelText: 'Title'),
                        validator: (v) => v == null || v.isEmpty ? 'Field required' : null,
                      ),
                      TextFormField(
                        controller: descController,
                        decoration: const InputDecoration(labelText: 'Description'),
                        validator: (v) => v == null || v.isEmpty ? 'Field required' : null,
                      ),
                      TextFormField(
                        controller: cityController,
                        decoration: const InputDecoration(labelText: 'City'),
                        validator: (v) => v == null || v.isEmpty ? 'Field required' : null,
                      ),
                      TextFormField(
                        controller: addressController,
                        decoration: const InputDecoration(labelText: 'Detailed Address'),
                        validator: (v) => v == null || v.isEmpty ? 'Field required' : null,
                      ),
                      TextFormField(
                        controller: rentController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Rent per month (₹)'),
                        validator: (v) => v == null || v.isEmpty ? 'Field required' : null,
                      ),
                      TextFormField(
                        controller: depositController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Security Deposit (₹)'),
                        validator: (v) => v == null || v.isEmpty ? 'Field required' : null,
                      ),
                      TextFormField(
                        controller: capacityController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Capacity (how many people allowed)'),
                        validator: (v) => v == null || v.isEmpty ? 'Field required' : null,
                      ),
                      TextFormField(
                        controller: amenitiesController,
                        decoration: const InputDecoration(labelText: 'Amenities (comma-separated)'),
                      ),
                      const SizedBox(height: 16),
                      
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: isUploadingImage || isSaving ? null : pickAndUploadImage,
                              icon: const Icon(Icons.photo_library_outlined),
                              label: const Text('Pick Room Image'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Theme.of(context).primaryColor.withValues(alpha: 0.1),
                                foregroundColor: Theme.of(context).primaryColor,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (isUploadingImage) ...[
                        const SizedBox(height: 12),
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                            SizedBox(width: 12),
                            Text('Uploading image to Supabase...', style: TextStyle(fontSize: 12)),
                          ],
                        ),
                      ],
                      if (uploadError != null) ...[
                        const SizedBox(height: 8),
                        Text(uploadError!, style: const TextStyle(color: Colors.redAccent, fontSize: 11)),
                      ],
                      if (uploadedImageUrl != null) ...[
                        const SizedBox(height: 12),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            height: 120,
                            width: double.infinity,
                            color: Colors.white10,
                            child: uploadedImageUrl!.startsWith('data:image')
                                ? Image.memory(base64Decode(uploadedImageUrl!.split('base64,')[1]), fit: BoxFit.cover)
                                : Image.network(uploadedImageUrl!, fit: BoxFit.cover),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSaving ? null : () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: isUploadingImage || isSaving ? null : () async {
                    if (!formKey.currentState!.validate()) return;
                    if (uploadedImageUrl == null) {
                      setStateDialog(() {
                        saveError = 'Please pick and upload a room image first.';
                      });
                      return;
                    }
                    
                    setStateDialog(() {
                      isSaving = true;
                      saveError = null;
                    });
                    
                    final cityText = cityController.text.trim();
                    final addressText = addressController.text.trim();
                    final fullAddress = "$addressText, $cityText";
                    
                    double lat = 12.9716;
                    double lng = 77.5946;
                    
                    if (cityText.toLowerCase() == 'bangalore') {
                      lat = 12.9716; lng = 77.5946;
                    } else if (cityText.toLowerCase() == 'delhi') {
                      lat = 28.6921; lng = 77.2090;
                    } else if (cityText.toLowerCase() == 'hyderabad') {
                      lat = 17.4065; lng = 78.4772;
                    }
                    
                    final coords = await geocodeAddress(fullAddress);
                    if (coords != null) {
                      lat = coords['latitude']!;
                      lng = coords['longitude']!;
                    } else {
                      final cityCoords = await geocodeAddress(cityText);
                      if (cityCoords != null) {
                        lat = cityCoords['latitude']!;
                        lng = cityCoords['longitude']!;
                      }
                    }

                    final room = Room(
                      id: '',
                      ownerId: widget.userId,
                      title: titleController.text.trim(),
                      description: descController.text.trim(),
                      city: cityText,
                      detailedAddress: addressText,
                      rent: int.parse(rentController.text.trim()),
                      amenities: amenitiesController.text.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList(),
                      images: [uploadedImageUrl!],
                      available: true,
                      verified: false,
                      rating: 5.0,
                      latitude: lat,
                      longitude: lng,
                      capacity: int.tryParse(capacityController.text.trim()) ?? 4,
                      deposit: int.tryParse(depositController.text.trim()) ?? 0,
                    );

                    try {
                      await db.createRoom(room);
                      if (context.mounted) {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Room listed successfully with auto-detected coordinates!')),
                        );
                      }
                    } catch (e) {
                      setStateDialog(() {
                        isSaving = false;
                        saveError = 'Error saving room: $e';
                      });
                    }
                  },
                  child: isSaving 
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Add Room'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showRequestDeletionDialog(BuildContext context, SupabaseService db, Room room) {
    final formKey = GlobalKey<FormState>();
    final reasonController = TextEditingController();
    bool isSaving = false;
    String? saveError;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            return AlertDialog(
              title: Row(
                children: [
                  Icon(Icons.delete_forever_rounded, color: Colors.red.shade700),
                  const SizedBox(width: 8),
                  const Text('Request Room Deletion'),
                ],
              ),
              content: Form(
                key: formKey,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'This request will be sent to the administrator for review and approval. The room listing will be permanently deleted once approved.',
                        style: TextStyle(fontSize: 13, color: Colors.black54),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        room.title,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      Text(
                        room.detailedAddress,
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: reasonController,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          labelText: 'Reason for Deletion',
                          hintText: 'e.g. Property no longer available, renovation, etc.',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Please enter a reason for deletion';
                          }
                          return null;
                        },
                      ),
                      if (saveError != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          saveError!,
                          style: const TextStyle(color: Colors.red, fontSize: 13),
                        ),
                      ]
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSaving ? null : () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red.shade700,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: isSaving
                      ? null
                      : () async {
                          if (formKey.currentState!.validate()) {
                            setStateDialog(() {
                              isSaving = true;
                              saveError = null;
                            });
                            try {
                              await db.requestRoomDeletion(
                                roomId: room.id,
                                ownerId: widget.userId,
                                roomTitle: room.title,
                                roomAddress: room.detailedAddress,
                                reason: reasonController.text.trim(),
                              );
                              if (context.mounted) {
                                Navigator.of(context).pop();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Room deletion request submitted successfully!'),
                                    backgroundColor: Colors.green,
                                  ),
                                );
                              }
                            } catch (e) {
                              setStateDialog(() {
                                isSaving = false;
                                saveError = 'Error: ${e.toString()}';
                              });
                            }
                          }
                        },
                  child: isSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text('Submit Request'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _analyzeRoomPricing(BuildContext context, SupabaseService db, Room room) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final analysis = await db.suggestOptimalPrice(
        city: room.city,
        currentPrice: room.rent,
        amenities: room.amenities,
      );

      if (!mounted) return;

      Navigator.pop(context); // Dismiss spinner

      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (context) {
          final avg = analysis['averageMarketPrice'] ?? room.rent;
          final optimal = analysis['suggestedOptimalPrice'] ?? room.rent;
          final status = analysis['pricingStatus'] ?? 'Optimal';
          final diff = analysis['priceDifferencePercent'] ?? 0;
          final tips = List<String>.from(analysis['tips'] ?? []);

          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(context).viewInsets.bottom + 24,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Pricing Intelligence Analysis',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const Divider(color: Color(0xFFEEEEEE)),
                const SizedBox(height: 12),
                Text(
                  room.title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Current Price: ₹${room.rent}/mo', style: const TextStyle(fontSize: 14)),
                    Text('City Average: ₹$avg/mo', style: const TextStyle(fontSize: 14, color: Colors.grey)),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Text('Suggested Optimal: ', style: TextStyle(fontSize: 14)),
                    Text(
                      '₹$optimal/mo',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.greenAccent, fontSize: 15),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: status == 'High'
                        ? Colors.red.withValues(alpha: 0.08)
                        : (status == 'Competitive' ? Colors.green.withValues(alpha: 0.08) : Colors.blue.withValues(alpha: 0.08)),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: status == 'High'
                          ? Colors.red.withValues(alpha: 0.3)
                          : (status == 'Competitive' ? Colors.green.withValues(alpha: 0.3) : Colors.blue.withValues(alpha: 0.3)),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        status == 'High'
                            ? Icons.warning_amber_rounded
                            : (status == 'Competitive' ? Icons.check_circle_outline : Icons.info_outline),
                        color: status == 'High'
                            ? Colors.redAccent
                            : (status == 'Competitive' ? Colors.greenAccent : Colors.blueAccent),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Your rate is $status${diff != 0 ? ' ($diff% ${diff > 0 ? 'above' : 'below'} suggested optimal)' : ''}.',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: status == 'High'
                                ? Colors.redAccent
                                : (status == 'Competitive' ? Colors.greenAccent : Colors.blueAccent),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Optimization Recommendations:',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 8),
                ...tips.map((t) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('• ', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
                          Expanded(child: Text(t, style: const TextStyle(color: Colors.grey, fontSize: 13, height: 1.4))),
                        ],
                      ),
                    )),
                const SizedBox(height: 16),
              ],
            ),
          );
        },
      );
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // Dismiss spinner
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to calculate pricing: $e')),
        );
      }
    }
  }

  void _showManageBillsDialog(BuildContext context, SupabaseService db, Room room) {
    final formKey = GlobalKey<FormState>();
    final monthController = TextEditingController(text: '${_getMonthName(DateTime.now().month)} ${DateTime.now().year}');
    final electController = TextEditingController(text: '0');
    final maidController = TextEditingController(text: '0');
    final wifiController = TextEditingController(text: '0');
    bool isSaving = false;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            return AlertDialog(
              title: Text('Manage Bills for ${room.title}'),
              content: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextFormField(
                        controller: monthController,
                        decoration: const InputDecoration(labelText: 'Billing Month', hintText: 'e.g. June 2026'),
                        validator: (v) => v == null || v.isEmpty ? 'Field required' : null,
                      ),
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: electController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Electricity/Current Bill (₹)', hintText: 'e.g. 1500'),
                        validator: (v) => v == null || v.isEmpty ? 'Field required' : null,
                      ),
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: maidController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Maid Bill (₹)', hintText: 'e.g. 2000'),
                        validator: (v) => v == null || v.isEmpty ? 'Field required' : null,
                      ),
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: wifiController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'WiFi Bill (₹)', hintText: 'e.g. 900'),
                        validator: (v) => v == null || v.isEmpty ? 'Field required' : null,
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: isSaving ? null : () async {
                    if (!formKey.currentState!.validate()) return;
                    setStateDialog(() {
                      isSaving = true;
                    });
                    
                    try {
                      final elect = int.tryParse(electController.text.trim()) ?? 0;
                      final maid = int.tryParse(maidController.text.trim()) ?? 0;
                      final wifi = int.tryParse(wifiController.text.trim()) ?? 0;
                      final month = monthController.text.trim();

                      // Prevent duplicate entries for the same month
                      final existing = await Supabase.instance.client
                          .from('room_bills')
                          .select('id')
                          .eq('room_id', room.id)
                          .eq('billing_month', month)
                          .maybeSingle();

                      if (existing != null) {
                        setStateDialog(() {
                          isSaving = false;
                        });
                        if (context.mounted) {
                          showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: const Text('Duplicate Bill Entry'),
                              content: Text('Bills for "$month" have already been added for this room. You can only add bills once per calendar month.'),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(ctx),
                                  child: const Text('OK'),
                                ),
                              ],
                            ),
                          );
                        }
                        return;
                      }

                      await db.addRoomBills(room.id, elect, maid, wifi, month);
                      
                      // Notify roommates about the new bill
                      try {
                        final activeBookings = await Supabase.instance.client
                            .from('bookings')
                            .select('student_id')
                            .eq('room_id', room.id)
                            .eq('status', 'Active');
                        
                        final roommates = (activeBookings as List)
                            .map((e) => e['student_id'].toString())
                            .toList();

                        for (var rId in roommates) {
                          await db.createNotification(
                            rId,
                            'billing',
                            'New Room Bills Added',
                            'The owner has added bills for $month: Electricity ₹$elect, Maid ₹$maid, WiFi ₹$wifi. Tap here to view your split share.',
                          );
                        }
                      } catch (err) {
                        debugPrint("Failed to send roommate billing notifications: $err");
                      }

                      if (context.mounted) {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Room bills saved and synchronized successfully!')),
                        );
                      }
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Failed to save bills: $e')),
                        );
                      }
                    } finally {
                      setStateDialog(() {
                        isSaving = false;
                      });
                    }
                  },
                  child: isSaving 
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Save Bills'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  String _getMonthName(int month) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (month >= 1 && month <= 12) return months[month - 1];
    return 'June';
  }

  void _showResolveTicketDialog(BuildContext context, SupabaseService db, MaintenanceTicket ticket) {
    final notesController = TextEditingController();
    bool isSaving = false;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            return AlertDialog(
              title: const Text('Resolve Complaint'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Issue: ${ticket.issue}', style: const TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  const Text('Write issue cleared or any report/notes after clearing (sent to all roommates):', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: notesController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      hintText: 'e.g. Plumber visited and fixed the leak. Pipe replaced.',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: isSaving ? null : () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: isSaving ? null : () async {
                    if (notesController.text.trim().isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Please enter resolution notes.')),
                      );
                      return;
                    }
                    setStateDialog(() {
                      isSaving = true;
                    });
                    try {
                      await db.updateTicketStatus(ticket.id, 'Resolved', resolutionNotes: notesController.text.trim());
                      if (context.mounted) {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Ticket resolved successfully! Roommates notified.')),
                        );
                      }
                    } catch (e) {
                      setStateDialog(() {
                        isSaving = false;
                      });
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Error resolving ticket: $e')),
                      );
                    }
                  },
                  child: isSaving
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Resolve'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildListingsTab(SupabaseService db) {
    return StreamBuilder<List<Room>>(
      stream: db.streamOwnerRooms(widget.userId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final rooms = snapshot.data ?? [];

        return StreamBuilder<List<Map<String, dynamic>>>(
          stream: db.streamOwnerDeletionRequests(widget.userId),
          builder: (context, requestSnapshot) {
            final requests = requestSnapshot.data ?? [];
            final requestMap = {
              for (var r in requests) r['room_id'] as String: r['status'] as String
            };
            final requestNotesMap = {
              for (var r in requests) r['room_id'] as String: r['admin_notes'] as String?
            };

            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('My Accommodations', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Theme.of(context).primaryColor,
                          foregroundColor: Colors.white,
                        ),
                        onPressed: () => _showAddRoomDialog(context, db),
                        icon: const Icon(Icons.add),
                        label: const Text('Add Room'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  if (rooms.isEmpty)
                    const Card(
                      child: Padding(
                        padding: EdgeInsets.all(32.0),
                        child: Center(
                          child: Text('You have not added any accommodations yet. Use "Add Room" above to list PGs/rooms real-time.'),
                        ),
                      ),
                    )
                  else
                    ... rooms.map((room) {
                      final deletionStatus = requestMap[room.id];
                      final adminNote = requestNotesMap[room.id];

                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: room.images.isEmpty
                                         ? Container(color: Colors.grey.shade100, width: 80, height: 80, child: const Icon(Icons.image))
                                         : _buildRoomImage(room.images.first, width: 80, height: 80, fit: BoxFit.cover),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(room.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                        const SizedBox(height: 6),
                                        Text('₹${room.rent}/mo • ${room.city}', style: TextStyle(color: Theme.of(context).primaryColor, fontWeight: FontWeight.bold)),
                                        const SizedBox(height: 4),
                                        Text('Capacity: ${room.capacity} roommates', style: const TextStyle(fontSize: 12, color: Colors.black54, fontWeight: FontWeight.bold)),
                                        const SizedBox(height: 2),
                                        Text('Status: ${room.available ? (room.verified ? 'Listed (Active)' : 'Pending Approval') : 'Draft'}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                        if (room.latitude != null && room.longitude != null) ...[
                                          const SizedBox(height: 2),
                                          Text('GPS: (${room.latitude!.toStringAsFixed(4)}, ${room.longitude!.toStringAsFixed(4)})', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                        ],
                                        if (deletionStatus != null) ...[
                                          const SizedBox(height: 6),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: deletionStatus == 'pending'
                                                  ? Colors.orange.withValues(alpha: 0.1)
                                                  : deletionStatus == 'approved'
                                                      ? Colors.green.withValues(alpha: 0.1)
                                                      : Colors.red.withValues(alpha: 0.1),
                                              borderRadius: BorderRadius.circular(4),
                                              border: Border.all(
                                                color: deletionStatus == 'pending'
                                                    ? Colors.orange
                                                    : deletionStatus == 'approved'
                                                        ? Colors.green
                                                        : Colors.red,
                                                width: 0.5,
                                              ),
                                            ),
                                            child: Text(
                                              'Deletion: ${deletionStatus.toUpperCase()}${adminNote != null && adminNote.isNotEmpty ? " ($adminNote)" : ""}',
                                              style: TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.bold,
                                                color: deletionStatus == 'pending'
                                                    ? Colors.orange.shade800
                                                    : deletionStatus == 'approved'
                                                        ? Colors.green.shade800
                                                        : Colors.red.shade800,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const Divider(height: 24, thickness: 1, color: Color(0xFFEEEEEE)),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceAround,
                                children: [
                                  TextButton.icon(
                                    icon: const Icon(Icons.receipt_long_rounded, color: Colors.green, size: 20),
                                    label: const Text('Bills', style: TextStyle(color: Colors.green, fontSize: 13, fontWeight: FontWeight.bold)),
                                    onPressed: () => _showManageBillsDialog(context, db, room),
                                  ),
                                  TextButton.icon(
                                    icon: const Icon(Icons.analytics_outlined, color: Colors.blueAccent, size: 20),
                                    label: const Text('Analyze', style: TextStyle(color: Colors.blueAccent, fontSize: 13, fontWeight: FontWeight.bold)),
                                    onPressed: () => _analyzeRoomPricing(context, db, room),
                                  ),
                                  TextButton.icon(
                                    icon: const Icon(Icons.edit_note_rounded, color: Colors.orangeAccent, size: 20),
                                    label: const Text('Edit', style: TextStyle(color: Colors.orangeAccent, fontSize: 13, fontWeight: FontWeight.bold)),
                                    onPressed: () => _showEditRoomDialog(context, db, room),
                                  ),
                                  TextButton.icon(
                                    icon: Icon(
                                      deletionStatus == 'pending'
                                          ? Icons.hourglass_empty_rounded
                                          : Icons.delete_outline_rounded,
                                      color: deletionStatus == 'pending'
                                          ? Colors.orange
                                          : deletionStatus == 'rejected'
                                              ? Colors.red
                                              : Colors.redAccent,
                                      size: 20,
                                    ),
                                    label: Text(
                                      deletionStatus == 'pending'
                                          ? 'Pending'
                                          : deletionStatus == 'rejected'
                                              ? 'Rejected'
                                              : 'Delete',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: deletionStatus == 'pending'
                                            ? Colors.orange
                                            : deletionStatus == 'rejected'
                                                ? Colors.red
                                                : Colors.redAccent,
                                      ),
                                    ),
                                    onPressed: deletionStatus == 'pending'
                                        ? null
                                        : () => _showRequestDeletionDialog(context, db, room),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<Map<String, dynamic>> _fetchRequestDetails(String studentId, String roomId) async {
    final auth = Provider.of<AuthService>(context, listen: false);
    final client = Supabase.instance.client;
    
    try {
      final student = await auth.fetchUserProfile(studentId);
      final roomData = await client.from('rooms').select('title').eq('id', roomId).maybeSingle();
      return {
        'student': student,
        'roomTitle': (roomData as Map?)?['title'] ?? 'Accommodation',
      };
    } catch (e) {
      debugPrint("Error fetching request details: $e");
      return {
        'student': null,
        'roomTitle': 'Accommodation',
      };
    }
  }

  Widget _buildRequestsTab(SupabaseService db) {
    return StreamBuilder<List<Booking>>(
      stream: db.streamBookings(widget.userId, true),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final allBookings = snapshot.data ?? [];
        final bookings = allBookings.where((b) => b.status == 'Requested').toList();

        if (bookings.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.pending_actions_rounded, size: 64, color: Colors.grey),
                SizedBox(height: 16),
                Text(
                  'No tenant booking requests pending.',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.grey),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: bookings.length,
          itemBuilder: (context, idx) {
            final req = bookings[idx];
            return FutureBuilder<Map<String, dynamic>>(
              future: _fetchRequestDetails(req.studentId, req.roomId),
              builder: (context, detailsSnapshot) {
                if (detailsSnapshot.connectionState == ConnectionState.waiting) {
                  return const Card(
                    child: Padding(
                      padding: EdgeInsets.all(20),
                      child: Center(child: CircularProgressIndicator()),
                    ),
                  );
                }

                final details = detailsSnapshot.data;
                final student = details?['student'] as CSUser?;
                final roomTitle = details?['roomTitle'] as String? ?? 'Accommodation';

                final studentName = student?.name ?? 'Student';
                final studentPic = student?.profilePic ?? 'https://api.dicebear.com/7.x/adventurer/png?seed=${req.studentId}';
                final studentEmail = student?.email ?? '';
                final trustScore = student?.trustScore ?? 85;

                return Card(
                  elevation: 3,
                  margin: const EdgeInsets.only(bottom: 16),
                  shape: RoundedRectangleBorder(
                    side: const BorderSide(color: Color(0xFFEEEEEE)),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Student Profile Header
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 26,
                              backgroundImage: NetworkImage(studentPic),
                              backgroundColor: Colors.grey.shade100,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          studentName,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      if (student?.verified == true) ...[
                                        const SizedBox(width: 4),
                                        const Icon(Icons.verified_rounded, color: Colors.blueAccent, size: 16),
                                      ],
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    student?.username != null && student!.username.isNotEmpty 
                                        ? '@${student.username}' 
                                        : studentEmail,
                                    style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: trustScore >= 90 ? Colors.green.withValues(alpha: 0.1) : Colors.amber.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                'Trust Score: $trustScore%',
                                style: TextStyle(
                                  color: trustScore >= 90 ? Colors.green.shade700 : Colors.amber.shade800,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 10,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        const Divider(height: 1, color: Color(0xFFEEEEEE)),
                        const SizedBox(height: 12),

                        // Request & Contact Details
                        Text(
                          'Requested PG / Room:',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade500),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          roomTitle,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        const SizedBox(height: 8),

                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Move-In Date',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade500),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  req.moveInDate.toString().split(' ')[0],
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  'Proposed Rent',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade500),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '₹${req.rent}/mo',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Theme.of(context).primaryColor),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),

                        // Student Habits / Preferences
                        if (student != null) ...[
                          Text(
                            'Student Habits & Preferences:',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade500),
                          ),
                          const SizedBox(height: 6),
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                _buildRequestBadge(
                                  icon: Icons.bedtime_rounded,
                                  label: student.preferences.sleepHabit,
                                  color: Colors.amber,
                                ),
                                const SizedBox(width: 6),
                                _buildRequestBadge(
                                  icon: Icons.clean_hands_rounded,
                                  label: student.preferences.cleanliness,
                                  color: Colors.blueAccent,
                                ),
                                const SizedBox(width: 6),
                                _buildRequestBadge(
                                  icon: Icons.restaurant_rounded,
                                  label: student.preferences.dietary,
                                  color: Colors.green,
                                ),
                                const SizedBox(width: 6),
                                _buildRequestBadge(
                                  icon: Icons.people_rounded,
                                  label: student.preferences.socialStatus,
                                  color: Colors.purple,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                        ],

                        // Message Button
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              final chatService = Provider.of<ChatService>(context, listen: false);
                              final chatRoomId = await chatService.getOrCreateChatRoom(
                                req.studentId,
                                widget.userId,
                                roomTitle,
                              );
                              if (!context.mounted) return;
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => ChatRoomScreen(
                                    chatRoomId: chatRoomId,
                                    currentUserId: widget.userId,
                                    currentUserName: widget.name,
                                    peerName: studentName,
                                  ),
                                ),
                              );
                            },
                            icon: const Icon(Icons.forum_outlined, size: 16),
                            label: const Text('Message Student to Negotiate', style: TextStyle(fontSize: 12)),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              side: BorderSide(color: Colors.grey.shade300),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Accept / Decline Row
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () async {
                                  // Update booking status to Cancelled / Rejected
                                  await db.updateBookingStatus(req.id, 'Cancelled');
                                  try {
                                    await db.createNotification(
                                      req.studentId,
                                      'booking',
                                      'Booking Request Declined',
                                      'Your booking request for "$roomTitle" has been cancelled by the owner.',
                                    );
                                  } catch (e) {
                                    debugPrint("Failed to notify student of cancellation: $e");
                                  }
                                },
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.redAccent,
                                  side: const BorderSide(color: Colors.redAccent),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                ),
                                child: const Text('Decline', style: TextStyle(fontWeight: FontWeight.bold)),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.green.shade600,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                ),
                                onPressed: () async {
                                  // Accept booking, set status to Active
                                  await db.updateBookingStatus(req.id, 'Active');
                                  try {
                                    await db.createNotification(
                                      req.studentId,
                                      'booking',
                                      'Booking Request Accepted!',
                                      'Your booking request for "$roomTitle" has been accepted by the owner! Please proceed to pay the deposit.',
                                    );
                                  } catch (e) {
                                    debugPrint("Failed to notify student of acceptance: $e");
                                  }
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Booking Accepted successfully!')),
                                    );
                                  }
                                },
                                child: const Text('Accept Request', style: TextStyle(fontWeight: FontWeight.bold)),
                              ),
                            ),
                          ],
                        )
                      ],
                    ),
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  Widget _buildRequestBadge({required IconData icon, required String label, required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            label.toUpperCase(),
            style: TextStyle(color: color.withValues(alpha: 0.9), fontSize: 10, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Future<List<CSUser?>> _fetchTenants(List<Booking> bookings) async {
    final auth = Provider.of<AuthService>(context, listen: false);
    try {
      return await Future.wait(bookings.map((b) => auth.fetchUserProfile(b.studentId)));
    } catch (e) {
      debugPrint("Error fetching tenant profiles: $e");
      return [];
    }
  }

  Widget _buildMyRoomsTab(SupabaseService db) {
    return StreamBuilder<List<Booking>>(
      stream: db.streamBookings(widget.userId, true),
      builder: (context, bookingsSnapshot) {
        if (bookingsSnapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        
        final bookings = bookingsSnapshot.data ?? [];
        final activeBookings = bookings.where((b) => b.status == 'Active').toList();
        
        if (activeBookings.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.meeting_room_outlined, size: 64, color: Colors.grey),
                SizedBox(height: 16),
                Text(
                  'No occupied rooms at the moment.',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.grey),
                ),
                SizedBox(height: 8),
                Text(
                  'Approved student requests will appear here.',
                  style: TextStyle(fontSize: 13, color: Colors.grey),
                ),
              ],
            ),
          );
        }

        return StreamBuilder<List<Room>>(
          stream: db.streamOwnerRooms(widget.userId),
          builder: (context, roomsSnapshot) {
            if (roomsSnapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }

            final rooms = roomsSnapshot.data ?? [];
            final roomMap = {for (var r in rooms) r.id: r};

            return StreamBuilder<List<MaintenanceTicket>>(
              stream: db.streamTickets(widget.userId, true),
              builder: (context, ticketsSnapshot) {
                final tickets = ticketsSnapshot.data ?? [];
                
                final Map<String, List<Booking>> roomBookingsMap = {};
                for (var b in activeBookings) {
                  roomBookingsMap.putIfAbsent(b.roomId, () => []).add(b);
                }

                final activeRoomIds = roomBookingsMap.keys.toList();

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: activeRoomIds.length,
                  itemBuilder: (context, idx) {
                    final roomId = activeRoomIds[idx];
                    final room = roomMap[roomId];
                    final roomBookings = roomBookingsMap[roomId] ?? [];
                    final roomTickets = tickets.where((t) => t.roomId == roomId && t.status != 'Resolved').toList();

                    if (room == null) {
                      return const SizedBox.shrink();
                    }

                    return _buildOccupiedRoomCard(context, db, room, roomBookings, roomTickets);
                  },
                );
              },
            );
          },
        );
      },
    );
  }

  Widget _buildOccupiedRoomCard(
    BuildContext context,
    SupabaseService db,
    Room room,
    List<Booking> roomBookings,
    List<MaintenanceTicket> roomTickets,
  ) {
    final primaryColor = Theme.of(context).primaryColor;
    return Card(
      elevation: 4,
      margin: const EdgeInsets.only(bottom: 20),
      shape: RoundedRectangleBorder(
        side: const BorderSide(color: Color(0xFFEFEFEF), width: 1),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: room.images.isEmpty
                      ? Container(
                          color: Colors.grey.shade100,
                          width: 90,
                          height: 90,
                          child: const Icon(Icons.image, size: 36, color: Colors.grey),
                        )
                      : _buildRoomImage(room.images.first, width: 90, height: 90, fit: BoxFit.cover),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        room.title,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, fontFamily: 'Outfit'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.location_on_outlined, size: 14, color: Colors.grey),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              room.detailedAddress,
                              style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '₹${room.rent}/mo',
                            style: TextStyle(
                              color: primaryColor,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              fontFamily: 'Outfit',
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.blue.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              'Occupancy: ${roomBookings.length}/${room.capacity}',
                              style: const TextStyle(
                                color: Colors.blue,
                                fontWeight: FontWeight.bold,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1, color: Color(0xFFEEEEEE)),
            const SizedBox(height: 12),

            if (roomTickets.isNotEmpty) ...[
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.orange.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.orange.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${roomTickets.length} pending maintenance ticket(s) unresolved.',
                        style: TextStyle(
                          color: Colors.orange.shade900,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    TextButton(
                      style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(50, 30)),
                      onPressed: () {
                        setState(() {
                          _tabIndex = 3;
                        });
                      },
                      child: const Text('View', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    )
                  ],
                ),
              ),
            ],

            const Text(
              'Active Tenants',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, fontFamily: 'Outfit'),
            ),
            const SizedBox(height: 8),
            FutureBuilder<List<CSUser?>>(
              future: _fetchTenants(roomBookings),
              builder: (context, tenantSnapshot) {
                if (tenantSnapshot.connectionState == ConnectionState.waiting) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))),
                  );
                }

                final tenants = tenantSnapshot.data ?? [];
                if (tenants.isEmpty || tenants.every((t) => t == null)) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Text(
                      'No tenant profile data found.',
                      style: TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                  );
                }

                return Column(
                  children: tenants.map((student) {
                    if (student == null) return const SizedBox.shrink();
                    final studentPic = student.profilePic.isNotEmpty
                        ? student.profilePic
                        : 'https://api.dicebear.com/7.x/adventurer/png?seed=${student.uid}';

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade200, width: 0.5),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundImage: NetworkImage(studentPic),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  student.name,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                                Text(
                                  student.email,
                                  style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: student.trustScore >= 90 ? Colors.green.withValues(alpha: 0.1) : Colors.amber.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              'TS: ${student.trustScore}%',
                              style: TextStyle(
                                color: student.trustScore >= 90 ? Colors.green.shade700 : Colors.amber.shade800,
                                fontWeight: FontWeight.bold,
                                fontSize: 10,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            icon: Icon(Icons.forum_outlined, size: 18, color: primaryColor),
                            onPressed: () async {
                              final chatService = Provider.of<ChatService>(context, listen: false);
                              final chatRoomId = await chatService.getOrCreateChatRoom(
                                student.uid,
                                widget.userId,
                                room.title,
                              );
                              if (!context.mounted) return;
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => ChatRoomScreen(
                                    chatRoomId: chatRoomId,
                                    currentUserId: widget.userId,
                                    currentUserName: widget.name,
                                    peerName: student.name,
                                  ),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                );
              },
            ),

            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green.shade600,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    onPressed: () => _showManageBillsDialog(context, db, room),
                    icon: const Icon(Icons.receipt_long_rounded, size: 18),
                    label: const Text(
                      'Manage Bills',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: primaryColor,
                      side: BorderSide(color: primaryColor),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    onPressed: () async {
                      final chatService = Provider.of<ChatService>(context, listen: false);
                      final List<String> activeRoommateIds = roomBookings.map((b) => b.studentId).toList();
                      activeRoommateIds.add(widget.userId);

                      final chatRoomId = await chatService.getOrCreateRoommateGroupChat(
                        room.id,
                        room.title,
                        activeRoommateIds,
                      );
                      if (!context.mounted) return;
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ChatRoomScreen(
                            chatRoomId: chatRoomId,
                            currentUserId: widget.userId,
                            currentUserName: widget.name,
                            peerName: '${room.title} Group Chat',
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.groups_rounded, size: 18),
                    label: const Text(
                      'Group Chat',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }


  Widget _buildTicketsTab(SupabaseService db) {
    return StreamBuilder<List<MaintenanceTicket>>(
      stream: db.streamTickets(widget.userId, true),
      builder: (context, snapshot) {
        final tickets = snapshot.data ?? [];
        if (tickets.isEmpty) {
          return const Center(child: Text('No active tenant complaints logged.'));
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: tickets.length,
          itemBuilder: (context, idx) {
            final t = tickets[idx];
            return Card(
              child: ListTile(
                title: Text(t.issue),
                subtitle: Text('SLA Target: 24h • Status: ${t.status}'),
                trailing: (t.status == 'Open') 
                    ? IconButton(
                        icon: const Icon(Icons.check_circle_outline, color: Colors.greenAccent),
                        onPressed: () => _showResolveTicketDialog(context, db, t),
                      )
                    : const Icon(Icons.check_circle, color: Colors.green),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildProfileTab(AuthService authService) {
    if (_loadingUser) {
      return const Center(child: CircularProgressIndicator());
    }

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
                Row(
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
                const SizedBox(height: 16),
                
                Text(
                  _currentUser.email.isEmpty ? 'Loading Email...' : _currentUser.email,
                  style: const TextStyle(color: Colors.grey, fontSize: 14),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: _currentUser.verified 
                        ? Colors.green.withValues(alpha: 0.12)
                        : _currentUser.verificationDocs.isNotEmpty
                            ? Colors.orange.withValues(alpha: 0.12)
                            : Colors.amber.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: _currentUser.verified 
                          ? Colors.green.withValues(alpha: 0.4)
                          : _currentUser.verificationDocs.isNotEmpty
                              ? Colors.orange.withValues(alpha: 0.4)
                              : Colors.amber.withValues(alpha: 0.4),
                    ),
                  ),
                  child: InkWell(
                    onTap: _currentUser.verified ? null : _showVerificationSheet,
                    borderRadius: BorderRadius.circular(20),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _currentUser.verified 
                                ? Icons.verified_user_rounded 
                                : _currentUser.verificationDocs.isNotEmpty
                                    ? Icons.hourglass_top_rounded
                                    : Icons.gpp_maybe_rounded,
                            color: _currentUser.verified 
                                ? Colors.green.shade700 
                                : _currentUser.verificationDocs.isNotEmpty
                                    ? Colors.orange.shade800
                                    : Colors.amber.shade800,
                            size: 18,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _currentUser.verified 
                                ? '✓ Verified Landlord Profile (Score: ${_currentUser.trustScore}%)' 
                                : _currentUser.verificationDocs.isNotEmpty
                                    ? '⏳ Landlord Docs Submitted - Awaiting Admin Approval'
                                    : '⚠️ Verify Landlord Account & Property Deed',
                            style: TextStyle(
                              color: _currentUser.verified 
                                  ? Colors.green.shade800 
                                  : _currentUser.verificationDocs.isNotEmpty
                                      ? Colors.orange.shade900
                                      : Colors.amber.shade900,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
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
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: OutlinedButton.icon(
              onPressed: () {
                Provider.of<AuthService>(context, listen: false).signOut();
                Navigator.pushAndRemoveUntil(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginSelectionScreen()),
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
      preferences: _currentUser.preferences,
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

  Future<Uint8List?> _pickImageWithSourceChoice(BuildContext context) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Select Document Source', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.camera_alt_rounded, color: Color(0xFFD32F2F)),
              title: const Text('Take Photo with Camera'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_rounded, color: Colors.blue),
              title: const Text('Choose from Gallery'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );

    if (source == null) return null;
    final picker = ImagePicker();
    final file = await picker.pickImage(source: source, imageQuality: 70);
    if (file != null) {
      return await file.readAsBytes();
    }
    return null;
  }

  void _showVerificationSheet() {
    final authService = Provider.of<AuthService>(context, listen: false);
    String selectedDocType = 'Property Deed';
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
                        'Landlord Verification Portal',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Upload your landlord or property documents to verify your account and listing status.',
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                  const SizedBox(height: 16),
                  
                  const Text('Select Document Type', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    // ignore: deprecated_member_use
                    value: selectedDocType,
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'Property Deed', child: Text('Property Deed')),
                      DropdownMenuItem(value: 'Aadhaar Card', child: Text('Aadhaar Card')),
                      DropdownMenuItem(value: 'Electricity Bill', child: Text('Electricity Bill')),
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
                                final bytes = await _pickImageWithSourceChoice(context);
                                if (bytes != null) {
                                  setSheetState(() {
                                    frontBytes = bytes;
                                  });
                                }
                              },
                              child: Container(
                                height: 110,
                                decoration: BoxDecoration(
                                  color: Colors.grey.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.grey.withValues(alpha: 0.3)),
                                ),
                                child: frontBytes == null
                                    ? const Center(
                                        child: Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Icon(Icons.add_photo_alternate_rounded, color: Colors.grey),
                                            SizedBox(height: 4),
                                            Text('Select Front (Camera/Gallery)', style: TextStyle(fontSize: 10, color: Colors.grey)),
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
                                final bytes = await _pickImageWithSourceChoice(context);
                                if (bytes != null) {
                                  setSheetState(() {
                                    backBytes = bytes;
                                  });
                                }
                              },
                              child: Container(
                                height: 110,
                                decoration: BoxDecoration(
                                  color: Colors.grey.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.grey.withValues(alpha: 0.3)),
                                ),
                                child: backBytes == null
                                    ? const Center(
                                        child: Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Icon(Icons.add_photo_alternate_rounded, color: Colors.grey),
                                            SizedBox(height: 4),
                                            Text('Select Back (Camera/Gallery)', style: TextStyle(fontSize: 10, color: Colors.grey)),
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
                                        content: Text('Landlord & Property documents uploaded! Submitted for Admin Verification & Approval.'),
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
                          : const Text('Start Document Scan & Upload', style: TextStyle(fontWeight: FontWeight.bold)),
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
      stream: db.streamUserNotifications(widget.userId),
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
              onPressed: () => _showNotificationsBottomSheet(context, db, widget.userId),
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
                                    color: isUnread ? Theme.of(context).primaryColor.withValues(alpha: 0.04) : Colors.white,
                                    margin: const EdgeInsets.symmetric(vertical: 4),
                                    child: ListTile(
                                      leading: CircleAvatar(
                                        backgroundColor: color.withValues(alpha: 0.1),
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

  void _showEditRoomDialog(BuildContext context, SupabaseService db, Room room) {
    final formKey = GlobalKey<FormState>();
    final rentController = TextEditingController(text: room.rent.toString());
    final depositController = TextEditingController(text: room.deposit.toString());
    final capacityController = TextEditingController(text: room.capacity.toString());
    bool isSaving = false;
    String? saveError;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            return AlertDialog(
              title: const Text('Edit Rent & Deposit'),
              content: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (saveError != null) ...[
                        Text(saveError!, style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
                        const SizedBox(height: 10),
                      ],
                      TextFormField(
                        controller: rentController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Rent per month (₹)'),
                        validator: (v) => v == null || v.isEmpty ? 'Field required' : null,
                      ),
                      TextFormField(
                        controller: depositController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Security Deposit (₹)'),
                        validator: (v) => v == null || v.isEmpty ? 'Field required' : null,
                      ),
                      TextFormField(
                        controller: capacityController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Capacity (Max roommates)'),
                        validator: (v) => v == null || v.isEmpty ? 'Field required' : null,
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSaving ? null : () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: isSaving ? null : () async {
                    if (!formKey.currentState!.validate()) return;
                    setStateDialog(() {
                      isSaving = true;
                      saveError = null;
                    });
                    try {
                      final updated = Room(
                        id: room.id,
                        ownerId: room.ownerId,
                        title: room.title,
                        description: room.description,
                        city: room.city,
                        detailedAddress: room.detailedAddress,
                        rent: int.parse(rentController.text.trim()),
                        amenities: room.amenities,
                        images: room.images,
                        available: room.available,
                        verified: room.verified,
                        rating: room.rating,
                        latitude: room.latitude,
                        longitude: room.longitude,
                        capacity: int.parse(capacityController.text.trim()),
                        deposit: int.parse(depositController.text.trim()),
                      );
                      
                      await Supabase.instance.client.from('rooms').update(updated.toMap()).eq('id', room.id);

                      // Notify active roommates
                      try {
                        final activeBookings = await Supabase.instance.client
                            .from('bookings')
                            .select('student_id')
                            .eq('room_id', room.id)
                            .eq('status', 'Active');
                        
                        final roommates = (activeBookings as List)
                            .map((e) => e['student_id'].toString())
                            .toList();

                        for (var rId in roommates) {
                          await db.createNotification(
                            rId,
                            'billing',
                            'Room Details Updated',
                            'The owner has updated the rent to ₹${rentController.text} and deposit to ₹${depositController.text} for "${room.title}".',
                          );
                        }
                      } catch (err) {
                        debugPrint("Failed to send roommate billing updates notifications: $err");
                      }

                      if (context.mounted) {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Room updated successfully!')),
                        );
                      }
                    } catch (e) {
                      setStateDialog(() {
                        isSaving = false;
                        saveError = 'Error updating room: $e';
                      });
                    }
                  },
                  child: isSaving 
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildWalletTab(SupabaseService db) {
    return FutureBuilder(
      future: Future.wait<dynamic>([
        Supabase.instance.client.from('bookings').select('*, rooms!inner(*)').eq('owner_id', widget.userId),
        db.fetchPayouts(widget.userId),
      ]),
      builder: (context, AsyncSnapshot<List<dynamic>> snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final bookings = (snapshot.data?[0] as List<dynamic>?) ?? [];
        final payouts = (snapshot.data?[1] as List<Payout>?) ?? [];

        // Calculate metrics
        int totalCollected = 0;
        for (var b in bookings) {
          final status = b['status']?.toString();
          if (status == 'Active' || status == 'Completed') {
            final rent = (b['rent'] as num?)?.toInt() ?? 0;
            totalCollected += rent;
          }
        }

        int totalWithdrawn = 0;
        for (var p in payouts) {
          totalWithdrawn += p.amount;
        }

        final int availableBalance = totalCollected > totalWithdrawn ? (totalCollected - totalWithdrawn) : 0;

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Owner Wallet Hero Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFD32F2F), Color(0xFFB71C1C)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFD32F2F).withValues(alpha: 0.3),
                      blurRadius: 16,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'OWNER WALLET BALANCE',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.2,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.shield_outlined, color: Colors.white, size: 14),
                              SizedBox(width: 4),
                              Text('Protected', style: TextStyle(color: Colors.white, fontSize: 11)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '₹${availableBalance.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 34,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: availableBalance <= 0 
                                ? null 
                                : () => _showWithdrawModal(context, db, availableBalance),
                            icon: const Icon(Icons.south_west_rounded),
                            label: const Text('Withdraw Rent Funds', style: TextStyle(fontWeight: FontWeight.bold)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: const Color(0xFFD32F2F),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    const Divider(color: Colors.white24),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Total Rent Collected', style: TextStyle(color: Colors.white70, fontSize: 11)),
                            const SizedBox(height: 2),
                            Text('₹$totalCollected', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                          ],
                        ),
                        Container(height: 25, width: 1, color: Colors.white24),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Total Withdrawn', style: TextStyle(color: Colors.white70, fontSize: 11)),
                            const SizedBox(height: 2),
                            Text('₹$totalWithdrawn', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),
              const Text(
                'Recent Transactions & Payouts',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),

              if (bookings.isEmpty && payouts.isEmpty) ...[
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: const Padding(
                    padding: EdgeInsets.all(32.0),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(Icons.account_balance_wallet_outlined, size: 48, color: Colors.grey),
                          SizedBox(height: 12),
                          Text('No wallet transactions logged yet.', style: TextStyle(color: Colors.grey)),
                        ],
                      ),
                    ),
                  ),
                ),
              ] else ...[
                // Render List of Payouts
                ...payouts.map((p) => Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: Colors.red.shade50,
                      child: const Icon(Icons.north_east_rounded, color: Colors.red),
                    ),
                    title: Text('Withdrawal to ${p.payoutMethod}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    subtitle: Text('${p.accountDetails} • ${p.createdAt.toLocal().toString().split(' ')[0]}', style: const TextStyle(fontSize: 12)),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('- ₹${p.amount}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.red, fontSize: 15)),
                        const SizedBox(height: 2),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(p.status, style: const TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),
                )),

                // Render Rent Income Bookings
                ...bookings.where((b) => b['status'] == 'Active' || b['status'] == 'Completed').map((b) => Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: Colors.green.shade50,
                      child: const Icon(Icons.south_west_rounded, color: Colors.green),
                    ),
                    title: Text('Rent Received (${b['rooms']?['title'] ?? 'Flat'})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    subtitle: Text('Status: ${b['status']}', style: const TextStyle(fontSize: 12)),
                    trailing: Text(
                      '+ ₹${b['rent']}',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green, fontSize: 15),
                    ),
                  ),
                )),
              ],
            ],
          ),
        );
      },
    );
  }

  void _showWithdrawModal(BuildContext context, SupabaseService db, int availableBalance) {
    final formKey = GlobalKey<FormState>();
    final amountController = TextEditingController();
    final detailsController = TextEditingController();
    String payoutMethod = 'UPI';
    bool isSubmitting = false;
    String? errorText;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Withdraw Rent Balance',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                    const Divider(),
                    const SizedBox(height: 12),
                    Text(
                      'Available Balance: ₹$availableBalance',
                      style: const TextStyle(color: Colors.grey, fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                    const SizedBox(height: 16),

                    if (errorText != null) ...[
                      Text(errorText!, style: const TextStyle(color: Colors.red, fontSize: 12)),
                      const SizedBox(height: 10),
                    ],

                    TextFormField(
                      controller: amountController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Withdrawal Amount (₹)',
                        prefixIcon: Icon(Icons.currency_rupee_rounded),
                        border: OutlineInputBorder(),
                      ),
                      validator: (val) {
                        if (val == null || val.isEmpty) return 'Enter withdrawal amount';
                        final amt = int.tryParse(val.trim());
                        if (amt == null || amt <= 0) return 'Enter valid positive amount';
                        if (amt > availableBalance) return 'Amount exceeds available balance (₹$availableBalance)';
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),

                    // Quick Selection Chips
                    Wrap(
                      spacing: 8,
                      children: [
                        ActionChip(
                          label: const Text('₹2,000'),
                          onPressed: () => amountController.text = '2000',
                        ),
                        ActionChip(
                          label: const Text('₹5,000'),
                          onPressed: () => amountController.text = '5000',
                        ),
                        ActionChip(
                          label: const Text('₹10,000'),
                          onPressed: () => amountController.text = '10000',
                        ),
                        ActionChip(
                          label: const Text('Withdraw All'),
                          onPressed: () => amountController.text = availableBalance.toString(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    DropdownButtonFormField<String>(
                      // ignore: deprecated_member_use
                      value: payoutMethod,
                      decoration: const InputDecoration(
                        labelText: 'Payout Transfer Method',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'UPI', child: Text('UPI ID (Instant Transfer)')),
                        DropdownMenuItem(value: 'Bank Transfer', child: Text('Bank Account (NEFT/IMPS)')),
                      ],
                      onChanged: (val) {
                        if (val != null) {
                          setSheetState(() => payoutMethod = val);
                        }
                      },
                    ),
                    const SizedBox(height: 16),

                    TextFormField(
                      controller: detailsController,
                      decoration: InputDecoration(
                        labelText: payoutMethod == 'UPI' ? 'UPI ID (e.g. owner@okicici)' : 'Account No. & IFSC Code',
                        hintText: payoutMethod == 'UPI' ? 'owner@upi' : 'A/C 123456789, IFSC HDFC0001234',
                        border: const OutlineInputBorder(),
                      ),
                      validator: (val) => val == null || val.trim().isEmpty ? 'Enter payout details' : null,
                    ),
                    const SizedBox(height: 24),

                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: isSubmitting
                            ? null
                            : () async {
                                if (!formKey.currentState!.validate()) return;
                                setSheetState(() {
                                  isSubmitting = true;
                                  errorText = null;
                                });

                                try {
                                  final amt = int.parse(amountController.text.trim());
                                  final payout = await db.requestPayout(
                                    ownerId: widget.userId,
                                    amount: amt,
                                    payoutMethod: payoutMethod,
                                    accountDetails: detailsController.text.trim(),
                                  );

                                  if (context.mounted) {
                                    Navigator.pop(context);
                                    setState(() {}); // Refresh wallet balance UI
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text('Withdrawal request of ₹$amt submitted! Reference ID: ${payout.referenceId}'),
                                        backgroundColor: Colors.green,
                                      ),
                                    );
                                  }
                                } catch (e) {
                                  setSheetState(() {
                                    isSubmitting = false;
                                    errorText = 'Withdrawal failed: $e';
                                  });
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD32F2F),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: isSubmitting
                            ? const CircularProgressIndicator(color: Colors.white)
                            : const Text('Confirm Withdrawal', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      ),
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

  @override
  Widget build(BuildContext context) {
    final db = Provider.of<SupabaseService>(context, listen: false);
    final auth = Provider.of<AuthService>(context, listen: false);

    return Scaffold(
      appBar: _tabIndex == 5 
          ? null 
          : AppBar(
              title: Text('${widget.name}\'s Hub'),
              actions: [
                _buildNotificationIcon(context, db),
              ],
            ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _tabIndex,
        selectedItemColor: Theme.of(context).primaryColor,
        type: BottomNavigationBarType.fixed,
        onTap: (idx) => setState(() => _tabIndex = idx),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.roofing_rounded), label: 'Listings'),
          BottomNavigationBarItem(icon: Icon(Icons.meeting_room_rounded), label: 'My Rooms'),
          BottomNavigationBarItem(icon: Icon(Icons.pending_actions_rounded), label: 'Requests'),
          BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet_rounded), label: 'Wallet'),
          BottomNavigationBarItem(icon: Icon(Icons.handyman_rounded), label: 'Maintenance'),
          BottomNavigationBarItem(icon: Icon(Icons.forum_rounded), label: 'Messages'),
          BottomNavigationBarItem(icon: Icon(Icons.person_rounded), label: 'Profile'),
        ],
      ),
      body: _tabIndex == 0 ? _buildListingsTab(db)
          : _tabIndex == 1 ? _buildMyRoomsTab(db)
          : _tabIndex == 2 ? _buildRequestsTab(db)
          : _tabIndex == 3 ? _buildWalletTab(db)
          : _tabIndex == 4 ? _buildTicketsTab(db)
          : _tabIndex == 5 ? ChatsListScreen(currentUserId: widget.userId, currentUserName: widget.name)
          : _buildProfileTab(auth),
    );
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

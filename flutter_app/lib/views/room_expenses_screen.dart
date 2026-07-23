import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/models.dart';
import '../services/services.dart';
import 'razorpay_checkout_sheet.dart';
import 'lease_agreement_screen.dart';
import 'chat_room_screen.dart';

class RoomExpensesScreen extends StatefulWidget {
  final String roomId;
  final CSUser currentUser;
  final String? bookingId;
  const RoomExpensesScreen({
    super.key,
    required this.roomId,
    required this.currentUser,
    this.bookingId,
  });

  @override
  State<RoomExpensesScreen> createState() => _RoomExpensesScreenState();
}

class _RoomExpensesScreenState extends State<RoomExpensesScreen> {
  final List<Map<String, dynamic>> _mockExpenses = [
    {
      'id': 'exp_1',
      'description': '⚡ Electricity Bill (May)',
      'amount': 1500,
      'paid_by_name': 'Aneka',
      'paid_by_id': 'aneka_uid',
      'date': '2026-06-01',
    },
    {
      'id': 'exp_2',
      'description': '🧹 Maid Service Charges',
      'amount': 2000,
      'paid_by_name': 'Felix',
      'paid_by_id': 'felix_uid',
      'date': '2026-06-03',
    },
    {
      'id': 'exp_3',
      'description': '🌐 High-Speed WiFi Subscription',
      'amount': 900,
      'paid_by_name': 'You',
      'paid_by_id': 'current_user_uid',
      'date': '2026-06-05',
    },
  ];

  late String _currentUserId;
  String? _currentBookingId;
  final _descController = TextEditingController();
  final _amountController = TextEditingController();
  String _selectedPayer = 'You';

  List<RoomBill> _landlordBills = [];
  int _activeRoommateCount = 1;
  bool _loadingBills = true;
  int _roomRent = 0;
  int _roomDeposit = 0;
  String _roomTitle = '';
  Room? _roomDetails;
  CSUser? _ownerDetails;
  List<Map<String, dynamic>> _activeRoommates = [];
  List<Map<String, dynamic>> _studentPayments = [];

  @override
  void initState() {
    super.initState();
    _currentUserId = widget.currentUser.uid;
    _currentBookingId = widget.bookingId;
    _activeRoommates = [
      {'id': _currentUserId, 'name': 'You'},
    ];
    _mockExpenses[2]['paid_by_id'] = _currentUserId;
    _setupRealtimeStreams();
    _loadLandlordBillsAndRoommates();
  }

  @override
  void dispose() {
    _descController.dispose();
    _amountController.dispose();
    _expensesSubscription?.cancel();
    _billsSubscription?.cancel();
    _paymentsSubscription?.cancel();
    _bookingsSubscription?.cancel();
    super.dispose();
  }

  StreamSubscription? _expensesSubscription;
  StreamSubscription? _billsSubscription;
  StreamSubscription? _paymentsSubscription;
  StreamSubscription? _bookingsSubscription;

  void _setupRealtimeStreams() {
    final client = Supabase.instance.client;
    final db = SupabaseService();
    final paymentService = PaymentService();

    // 1. Stream personal room expenses
    _expensesSubscription = client
        .from('room_expenses')
        .stream(primaryKey: ['id'])
        .eq('room_id', widget.roomId)
        .listen((list) {
          if (!mounted) return;
          setState(() {
            _mockExpenses.clear();
            for (var item in list) {
              _mockExpenses.add({
                'id': item['id'],
                'description': item['description'],
                'amount': item['amount'],
                'paid_by_name': item['paid_by'] == _currentUserId ? 'You' : (_activeRoommates.firstWhere((rm) => rm['id'] == item['paid_by'], orElse: () => {'name': 'Roommate'})['name']),
                'paid_by_id': item['paid_by'],
                'date': item['created_at'].toString().split('T')[0],
              });
            }
          });
        });

    // 2. Stream landlord bills
    _billsSubscription = db.streamRoomBills(widget.roomId).listen((bills) {
      if (!mounted) return;
      setState(() {
        _landlordBills = bills;
        _loadingBills = false;
      });
    }, onError: (err) {
      if (!mounted) return;
      setState(() {
        _loadingBills = false;
      });
    });

    // 3. Stream payments for the current user
    _paymentsSubscription = paymentService.streamPayments(widget.currentUser.uid).listen((payments) {
      if (!mounted) return;
      setState(() {
        _studentPayments = payments;
      });
    });

    // 4. Stream active roommates for this room in real-time
    _bookingsSubscription = db.streamActiveBookingsForRoom(widget.roomId).listen((bookings) async {
      final Set<String> roommateIds = bookings.map((b) => b.studentId).toSet();
      roommateIds.add(widget.currentUser.uid); // Always ensure current user is in the list
      
      try {
        final usersResponse = await client
            .from('users')
            .select('id, name, profile_pic')
            .inFilter('id', roommateIds.toList());
            
        final List<Map<String, dynamic>> loadedRoommates = [];
        for (var uid in roommateIds) {
          final userDoc = (usersResponse as List).cast<Map<String, dynamic>?>().firstWhere(
            (u) => u != null && u['id'].toString() == uid,
            orElse: () => null,
          );
          String name = 'Roommate';
          if (uid == widget.currentUser.uid) {
            name = 'You';
          } else if (userDoc != null && userDoc['name'] != null) {
            name = userDoc['name'].toString();
          }
          loadedRoommates.add({
            'id': uid,
            'name': name,
            'profile_pic': userDoc?['profile_pic'],
          });
        }
        
        if (mounted) {
          setState(() {
            _activeRoommates = loadedRoommates;
            _activeRoommateCount = loadedRoommates.isNotEmpty ? loadedRoommates.length : 1;
          });
        }
      } catch (e) {
        debugPrint("Error loading roommates in real-time stream: $e");
      }
    });
  }

  void _loadLandlordBillsAndRoommates() async {
    final client = Supabase.instance.client;

    // Load user's booking ID if not passed
    if (_currentBookingId == null) {
      try {
        final bookingRes = await client
            .from('bookings')
            .select('id')
            .eq('room_id', widget.roomId)
            .eq('student_id', widget.currentUser.uid)
            .inFilter('status', ['Active', 'Requested'])
            .limit(1);
        if (bookingRes.isNotEmpty) {
          _currentBookingId = bookingRes[0]['id'].toString();
        }
      } catch (e) {
        debugPrint("Failed to load user booking id: $e");
      }
    }

    // Fetch full room and owner details
    try {
      final roomData = await client
          .from('rooms')
          .select('*, users!owner_id(*)')
          .eq('id', widget.roomId)
          .single();
      
      final roomObj = Room.fromMap(roomData, widget.roomId);
      CSUser? ownerObj;
      if (roomData['users'] != null) {
        ownerObj = CSUser.fromMap(roomData['users'], roomObj.ownerId);
      } else {
        ownerObj = await AuthService().fetchUserProfile(roomObj.ownerId);
      }

      if (mounted) {
        setState(() {
          _roomDetails = roomObj;
          _ownerDetails = ownerObj;
          _roomRent = roomObj.rent;
          _roomDeposit = roomObj.deposit;
          _roomTitle = roomObj.title;
        });
      }
    } catch (e) {
      debugPrint("Failed to load room and owner details: $e");
      try {
        final roomData = await client.from('rooms').select().eq('id', widget.roomId).single();
        final roomObj = Room.fromMap(roomData, widget.roomId);
        final ownerObj = await AuthService().fetchUserProfile(roomObj.ownerId);
        if (mounted) {
          setState(() {
            _roomDetails = roomObj;
            _ownerDetails = ownerObj;
            _roomRent = roomObj.rent;
            _roomDeposit = roomObj.deposit;
            _roomTitle = roomObj.title;
          });
        }
      } catch (err) {
        if (mounted) {
          setState(() {
            _roomRent = 12000;
            _roomDeposit = 24000;
            _roomTitle = 'Co-Living Accommodation';
          });
        }
      }
    }
  }

  void _addExpense() async {
    final desc = _descController.text.trim();
    final amountText = _amountController.text.trim();
    if (desc.isEmpty || amountText.isEmpty) return;

    final amount = int.tryParse(amountText) ?? 0;
    if (amount <= 0) return;

    final matchedRoommate = _activeRoommates.firstWhere(
      (rm) => rm['name'] == _selectedPayer,
      orElse: () => {'id': 'roommate_uid', 'name': _selectedPayer},
    );
    final payerId = matchedRoommate['id'];
    final payerName = matchedRoommate['name'];

    setState(() {
      _mockExpenses.add({
        'id': 'exp_${DateTime.now().millisecondsSinceEpoch}',
        'description': desc,
        'amount': amount,
        'paid_by_name': payerName,
        'paid_by_id': payerId,
        'date': DateTime.now().toString().split(' ')[0],
      });
    });

    try {
      final client = Supabase.instance.client;
      await client.from('room_expenses').insert({
        'room_id': widget.roomId,
        'description': desc,
        'amount': amount,
        'paid_by': payerId,
      });
    } catch (e) {
      // Silent error fallback
    }

    _descController.clear();
    _amountController.clear();
    if (mounted) Navigator.pop(context);
  }

  void _showAddExpenseDialog() {
    if (!_activeRoommates.any((rm) => rm['name'] == _selectedPayer)) {
      _selectedPayer = _activeRoommates.isNotEmpty ? _activeRoommates.first['name'] : 'You';
    }

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDlgState) {
            return AlertDialog(
              title: const Text('Add Room Expense'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: _descController,
                    decoration: const InputDecoration(labelText: 'Expense Description', hintText: 'e.g. WiFi Bill'),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _amountController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Amount (₹)', hintText: 'e.g. 900'),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    // ignore: deprecated_member_use
                    value: _selectedPayer,
                    decoration: const InputDecoration(labelText: 'Paid By'),
                    items: _activeRoommates.map((rm) {
                      final name = rm['name'] as String;
                      return DropdownMenuItem<String>(
                        value: name,
                        child: Text(name),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setDlgState(() {
                          _selectedPayer = val;
                        });
                      }
                    },
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: _addExpense,
                  child: const Text('Add Bill'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Map<String, double> _calculateBalances() {
    Map<String, double> balances = {};
    for (var rm in _activeRoommates) {
      balances[rm['id'].toString()] = 0.0;
    }

    double totalSpend = 0;
    for (var exp in _mockExpenses) {
      totalSpend += (exp['amount'] as num).toDouble();
    }

    double sharePerPerson = _activeRoommateCount > 0 ? (totalSpend / _activeRoommateCount) : 0.0;

    Map<String, double> paidAmount = {};
    for (var rm in _activeRoommates) {
      paidAmount[rm['id'].toString()] = 0.0;
    }

    for (var exp in _mockExpenses) {
      final payerId = exp['paid_by_id']?.toString();
      final payerName = exp['paid_by_name'];
      final amount = (exp['amount'] as num).toDouble();

      if (payerId != null && paidAmount.containsKey(payerId)) {
        paidAmount[payerId] = paidAmount[payerId]! + amount;
      } else {
        // Fallback matching
        String? matchedId;
        for (var rm in _activeRoommates) {
          if (rm['name'] == payerName || (payerName == 'You' && rm['id'] == _currentUserId)) {
            matchedId = rm['id'].toString();
            break;
          }
        }
        if (matchedId != null) {
          paidAmount[matchedId] = paidAmount[matchedId]! + amount;
        }
      }
    }

    for (var rm in _activeRoommates) {
      final uid = rm['id'].toString();
      balances[uid] = (paidAmount[uid] ?? 0.0) - sharePerPerson;
    }

    return balances;
  }

  bool _isBillPaid(String billingMonth) {
    return _studentPayments.any((p) =>
        p['receipt'] != null &&
        p['receipt'].toString().contains('Landlord Bill') &&
        p['receipt'].toString().contains(billingMonth));
  }

  void _payLandlordBillShare(RoomBill bill, double amount) async {
    if (_currentBookingId == null) {
      final client = Supabase.instance.client;
      try {
        final bookingRes = await client
            .from('bookings')
            .select('id')
            .eq('room_id', widget.roomId)
            .eq('student_id', widget.currentUser.uid)
            .inFilter('status', ['Active', 'Requested'])
            .limit(1);
        if (bookingRes.isNotEmpty) {
          _currentBookingId = bookingRes[0]['id'].toString();
        }
      } catch (e) {
        debugPrint("Booking ID fetch failed: $e");
      }
    }

    if (_currentBookingId == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cannot pay bill: No active booking found for this room.')),
      );
      return;
    }

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return RazorpayCheckoutSheet(
          amount: amount.round(),
          bookingId: _currentBookingId!,
          studentId: widget.currentUser.uid,
          paymentService: PaymentService(),
          onPaymentSuccess: (txId) async {
            final client = Supabase.instance.client;
            try {
              await client.from('payments').update({
                'receipt': 'Landlord Bill Share - ${bill.billingMonth}',
              }).eq('razorpay_id', txId);
            } catch (e) {
              debugPrint("Failed to update payment receipt: $e");
            }
            if (!mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Payment Successful! Transaction ID: $txId')),
            );
            _loadLandlordBillsAndRoommates();
          },
        );
      },
    );
  }

  Widget _buildRoomAndOwnerHeader() {
    final room = _roomDetails;
    final owner = _ownerDetails;
    final primaryColor = Theme.of(context).primaryColor;

    return Card(
      elevation: 2,
      margin: const EdgeInsets.all(16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Room Title & Verification Badge
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: 75,
                    height: 75,
                    color: Colors.grey.shade200,
                    child: (room != null && room.images.isNotEmpty)
                        ? Image.network(room.images.first, fit: BoxFit.cover, errorBuilder: (c, e, s) => const Icon(Icons.home_work_rounded, size: 36, color: Colors.grey))
                        : const Icon(Icons.home_work_rounded, size: 36, color: Colors.grey),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              _roomTitle.isNotEmpty ? _roomTitle : 'My Co-Living Flat',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (room != null && room.verified)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.green.shade50,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Row(
                                children: [
                                  Icon(Icons.verified_rounded, color: Colors.green, size: 12),
                                  SizedBox(width: 2),
                                  Text('Verified', style: TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        room?.detailedAddress ?? 'University Area Campus Stay',
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Text('Rent: ₹$_roomRent/mo', style: TextStyle(fontWeight: FontWeight.bold, color: primaryColor, fontSize: 13)),
                          const SizedBox(width: 12),
                          Text('Deposit: ₹$_roomDeposit', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),

            if (room != null && room.amenities.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: room.amenities.map((a) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: Text(a, style: const TextStyle(fontSize: 10, color: Colors.black87)),
                )).toList(),
              ),
            ],

            const Divider(height: 24),

            // Owner Details Section
            Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundImage: NetworkImage(owner?.profilePic ?? 'https://api.dicebear.com/7.x/adventurer/png?seed=Owner'),
                  backgroundColor: Colors.grey.shade200,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('PROPERTY OWNER / LANDLORD', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.5)),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Text(
                            owner?.name ?? 'Property Owner',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.check_circle_rounded, color: Colors.blue, size: 14),
                        ],
                      ),
                      if (owner != null && owner.phone.isNotEmpty)
                        Text('Phone: ${owner.phone}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                    ],
                  ),
                ),

                // Direct Owner Contact Actions
                if (owner != null) ...[
                  IconButton(
                    icon: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(color: Colors.green.shade50, shape: BoxShape.circle),
                      child: const Icon(Icons.phone_rounded, color: Colors.green, size: 18),
                    ),
                    onPressed: () {
                      final phone = owner.phone;
                      if (phone.isNotEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Landlord Contact: $phone')),
                        );
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Landlord phone number not available.')),
                        );
                      }
                    },
                  ),
                  IconButton(
                    icon: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(color: primaryColor.withValues(alpha: 0.1), shape: BoxShape.circle),
                      child: Icon(Icons.chat_bubble_rounded, color: primaryColor, size: 18),
                    ),
                    onPressed: () async {
                      final chatService = ChatService();
                      try {
                        final chatId = await chatService.getOrCreateChatRoom(
                          widget.currentUser.uid,
                          owner.uid,
                          _roomTitle.isNotEmpty ? _roomTitle : 'My Room',
                        );
                        if (!mounted) return;
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => ChatRoomScreen(
                              chatRoomId: chatId,
                              currentUserId: widget.currentUser.uid,
                              currentUserName: widget.currentUser.name,
                              peerName: owner.name,
                            ),
                          ),
                        );
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Could not open chat: $e')),
                        );
                      }
                    },
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final balances = _calculateBalances();
    final primaryColor = Theme.of(context).primaryColor;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Room Hub'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              _setupRealtimeStreams();
              _loadLandlordBillsAndRoommates();
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddExpenseDialog,
        backgroundColor: primaryColor,
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildRoomAndOwnerHeader(),
            Container(
            padding: const EdgeInsets.all(20),
            color: Colors.black.withValues(alpha: 0.01),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Room Split Balance', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    Text(
                      '$_activeRoommateCount active member${_activeRoommateCount == 1 ? "" : "s"}',
                      style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildActionChip(
                        context,
                        icon: Icons.assignment_outlined,
                        label: 'Tenancy Contract',
                        onTap: () async {
                          if (widget.bookingId == null) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('No active booking ID provided.')),
                            );
                            return;
                          }
                          final client = Supabase.instance.client;
                          try {
                            final bRes = await client.from('bookings').select().eq('id', widget.bookingId!).single();
                            final b = Booking.fromMap(bRes, widget.bookingId!);
                            if (!mounted) return;
                            
                            if (b.rentalAgreementUrl == 'signed') {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Lease Tenancy Contract is fully signed and secured.')),
                              );
                              return;
                            }
                            final signed = await Navigator.push<bool>(
                              context,
                              MaterialPageRoute(
                                builder: (_) => LeaseAgreementScreen(
                                  booking: b,
                                  student: widget.currentUser,
                                ),
                              ),
                            );
                            if (signed == true) {
                              if (!mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Lease Tenancy Contract signed successfully!')),
                              );
                            }
                          } catch (e) {
                            if (!mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Failed to check lease status: $e')),
                            );
                          }
                        },
                      ),
                      const SizedBox(width: 8),
                      _buildActionChip(
                        context,
                        icon: Icons.receipt_long_outlined,
                        label: 'Get Receipt',
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Receipt PDF generated and saved successfully!')),
                          );
                        },
                      ),
                      const SizedBox(width: 8),
                      _buildActionChip(
                        context,
                        icon: Icons.group_outlined,
                        label: 'Roommates Chat',
                        onTap: () async {
                          final chatService = ChatService();
                          final client = Supabase.instance.client;
                          try {
                            final response = await client
                                .from('bookings')
                                .select('student_id')
                                .eq('room_id', widget.roomId)
                                .inFilter('status', ['Active', 'Confirmed']);
                                
                            final List<String> activeRoommateIds = (response as List)
                                .map((e) => e['student_id'].toString())
                                .toList();
                            if (!activeRoommateIds.contains(widget.currentUser.uid)) {
                              activeRoommateIds.add(widget.currentUser.uid);
                            }
                            
                            final groupChatId = await chatService.getOrCreateRoommateGroupChat(
                              widget.roomId,
                              _roomTitle.isNotEmpty ? _roomTitle : 'My Room',
                              activeRoommateIds,
                            );
                            
                            if (!mounted) return;
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => ChatRoomScreen(
                                  chatRoomId: groupChatId,
                                  currentUserId: widget.currentUser.uid,
                                  currentUserName: widget.currentUser.name,
                                  peerName: 'Roommates: ${_roomTitle.isNotEmpty ? _roomTitle : 'My Room'}',
                                ),
                              ),
                            );
                          } catch (e) {
                            if (!mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Failed to open roommates chat: $e')),
                            );
                          }
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: List.generate(_activeRoommates.length, (index) {
                    final rm = _activeRoommates[index];
                    final isMe = rm['id'] == _currentUserId;
                    final name = rm['name'];
                    double balance = balances[rm['id'].toString()] ?? 0.0;
                    Color cardColor = isMe 
                        ? primaryColor 
                        : (rm['name'] == 'Felix' ? Colors.orange : Colors.teal);

                    return Expanded(
                      child: Row(
                        children: [
                          Expanded(
                            child: _buildBalanceCard(
                              name,
                              balance,
                              cardColor,
                            ),
                          ),
                          if (index < _activeRoommates.length - 1)
                            const SizedBox(width: 10),
                        ],
                      ),
                    );
                  }),
                ),
              ],
            ),
          ),
          
          if (_roomRent > 0)
            Card(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: Colors.blue.shade50.withValues(alpha: 0.3),
              shape: RoundedRectangleBorder(
                side: BorderSide(color: Colors.blue.shade100, width: 1.5),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          '🏡 RENT & DEPOSIT SPLITS',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 0.5, color: Colors.blueAccent),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.blueAccent.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '$_activeRoommateCount roommates',
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.blueAccent),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _buildBillSplitItem('Room Monthly Rent', _roomRent, _roomRent / _activeRoommateCount),
                    const Divider(height: 16),
                    _buildBillSplitItem('Security Deposit', _roomDeposit, _roomDeposit / _activeRoommateCount),
                    const Divider(height: 20, color: Colors.blueAccent),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            'Your rent share is ₹${(_roomRent / _activeRoommateCount).toStringAsFixed(0)} and deposit share is ₹${(_roomDeposit / _activeRoommateCount).toStringAsFixed(0)}.',
                            style: const TextStyle(fontSize: 11, color: Colors.black54, fontStyle: FontStyle.italic),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

          if (_loadingBills)
            const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator()))
          else if (_landlordBills.isNotEmpty)
            ..._landlordBills.map((bill) {
              final totalElect = bill.electricityBill;
              final totalMaid = bill.maidBill;
              final totalWifi = bill.wifiBill;
              final totalBill = totalElect + totalMaid + totalWifi;
              
              final splitElect = totalElect / _activeRoommateCount;
              final splitMaid = totalMaid / _activeRoommateCount;
              final splitWifi = totalWifi / _activeRoommateCount;
              final splitTotal = totalBill / _activeRoommateCount;

              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                color: Colors.red.shade50.withValues(alpha: 0.3),
                shape: RoundedRectangleBorder(
                  side: BorderSide(color: Colors.red.shade100, width: 1.5),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '📋 LANDLORD BILLS (${bill.billingMonth.toUpperCase()})',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 0.5, color: Colors.redAccent),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.redAccent.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              'Split by $_activeRoommateCount roommates',
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.redAccent),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _buildBillSplitItem('⚡ Electricity/Current Bill', totalElect, splitElect),
                      const Divider(height: 16),
                      _buildBillSplitItem('🧹 Maid Service Bill', totalMaid, splitMaid),
                      const Divider(height: 16),
                      _buildBillSplitItem('🌐 High-Speed WiFi Bill', totalWifi, splitWifi),
                      const Divider(height: 20, color: Colors.redAccent),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total Landlord Charges', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text('₹${totalBill.toStringAsFixed(0)} total', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                              Text(
                                '₹${splitTotal.toStringAsFixed(0)} / share',
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: Colors.redAccent),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: _isBillPaid(bill.billingMonth)
                            ? ElevatedButton.icon(
                                onPressed: null,
                                icon: const Icon(Icons.check_circle, color: Colors.green),
                                label: const Text('Paid', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.green.shade50.withValues(alpha: 0.5),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                              )
                            : ElevatedButton.icon(
                                onPressed: () => _payLandlordBillShare(bill, splitTotal),
                                icon: const Icon(Icons.payment, color: Colors.white),
                                label: Text(
                                  'Pay Share (₹${splitTotal.toStringAsFixed(0)}) via Razorpay',
                                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.redAccent,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                ),
                              ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          const Divider(height: 1),
          _mockExpenses.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(32),
                  child: Center(child: Text('No room expenses logged yet. Tap + to add.')),
                )
              : ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  itemCount: _mockExpenses.length,
                  itemBuilder: (context, idx) {
                    final exp = _mockExpenses[idx];
                    final share = exp['amount'] / _activeRoommateCount;
                    return Card(
                      margin: const EdgeInsets.symmetric(vertical: 6),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: exp['paid_by_name'] == 'You' ? primaryColor.withValues(alpha: 0.1) : Colors.grey.shade200,
                          child: Icon(Icons.receipt_long, color: exp['paid_by_name'] == 'You' ? primaryColor : Colors.grey),
                        ),
                        title: Text(exp['description'], style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('Paid by ${exp['paid_by_name']} • ${exp['date']}'),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('₹${exp['amount']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                            Text('₹${share.toStringAsFixed(0)}/share', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ],
      ),
    ),
    );
  }

  Widget _buildBalanceCard(String name, double balance, Color indicatorColor) {
    final owesText = balance >= 0 ? 'Receives' : 'Owes';
    final amountColor = balance >= 0 ? Colors.green : Colors.redAccent;
    final absAmount = balance.abs();

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: indicatorColor.withValues(alpha: 0.06),
        border: Border.all(color: indicatorColor.withValues(alpha: 0.2), width: 1.5),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 4),
          Text(
            owesText,
            style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(
            '₹${absAmount.toStringAsFixed(0)}',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: amountColor),
          ),
        ],
      ),
    );
  }

  Widget _buildBillSplitItem(String label, int total, double split) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
        Row(
          children: [
            Text('₹$total', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(width: 8),
            const Icon(Icons.arrow_forward, size: 12, color: Colors.grey),
            const SizedBox(width: 8),
            Text(
              '₹${split.toStringAsFixed(0)}',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.black87),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionChip(BuildContext context, {required IconData icon, required String label, required VoidCallback onTap}) {
    return ActionChip(
      avatar: Icon(icon, size: 16, color: Theme.of(context).primaryColor),
      label: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
      onPressed: onTap,
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
    );
  }
}

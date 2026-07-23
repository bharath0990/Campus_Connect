import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/services.dart';

class TicketSystemScreen extends StatefulWidget {
  final String studentId;
  const TicketSystemScreen({super.key, required this.studentId});

  @override
  State<TicketSystemScreen> createState() => _TicketSystemScreenState();
}

class _TicketSystemScreenState extends State<TicketSystemScreen> {
  final _issueController = TextEditingController();
  bool _submitting = false;
  
  List<Map<String, dynamic>> _activeBookings = [];
  Map<String, dynamic>? _selectedBooking;
  bool _loadingBookings = true;

  @override
  void initState() {
    super.initState();
    _loadActiveBookings();
  }

  void _loadActiveBookings() async {
    final db = Provider.of<SupabaseService>(context, listen: false);
    final bookings = await db.fetchActiveBookingsWithRooms(widget.studentId);
    setState(() {
      _activeBookings = bookings;
      if (bookings.isNotEmpty) {
        _selectedBooking = bookings.first;
      }
      _loadingBookings = false;
    });
  }

  @override
  void dispose() {
    _issueController.dispose();
    super.dispose();
  }

  void _handleSubmit(SupabaseService db) async {
    final issue = _issueController.text.trim();
    if (issue.isEmpty || _selectedBooking == null) return;

    setState(() {
      _submitting = true;
    });

    try {
      final room = _selectedBooking!['rooms'] as Map<String, dynamic>? ?? {};
      final roomTitle = room['title'] ?? 'Room';
      final detailedAddress = room['detailed_address'] ?? 'Accommodation Address';
      final fullAddress = "$roomTitle, $detailedAddress";

      await db.raiseMaintenanceTicket(
        _selectedBooking!['room_id'].toString(),
        _selectedBooking!['owner_id'].toString(),
        widget.studentId,
        issue,
        fullAddress,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ticket submitted successfully. SLA countdown initialized.')),
      );
      Navigator.pop(context);
    } catch (e) {
      setState(() {
        _submitting = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to submit ticket: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final db = Provider.of<SupabaseService>(context, listen: false);

    return Scaffold(
      appBar: AppBar(title: const Text('New Maintenance Request')),
      body: _loadingBookings
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('What issue are you facing?', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text('Provide details of the repair or amenity malfunction.', style: TextStyle(color: Colors.grey, fontSize: 13)),
                  const SizedBox(height: 24),
                  
                  if (_activeBookings.isEmpty) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.red.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.redAccent.withValues(alpha: 0.3)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.error_outline_rounded, color: Colors.redAccent),
                          SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'No active room bookings found. You must have an active booking to submit a maintenance ticket.',
                              style: TextStyle(fontSize: 13, color: Colors.redAccent, height: 1.4),
                            ),
                          )
                        ],
                      ),
                    ),
                    const SizedBox(height: 30),
                  ] else ...[
                    DropdownButtonFormField<Map<String, dynamic>>(
                      // ignore: deprecated_member_use
                      value: _selectedBooking,
                      decoration: const InputDecoration(
                        labelText: 'Select Rented Room',
                        prefixIcon: Icon(Icons.meeting_room_outlined),
                        border: OutlineInputBorder(),
                      ),
                      items: _activeBookings.map((booking) {
                        final room = booking['rooms'] as Map<String, dynamic>? ?? {};
                        final title = room['title'] ?? 'Rented Room';
                        return DropdownMenuItem<Map<String, dynamic>>(
                          value: booking,
                          child: Text(title, overflow: TextOverflow.ellipsis),
                        );
                      }).toList(),
                      onChanged: _submitting ? null : (val) {
                        setState(() {
                          _selectedBooking = val;
                        });
                      },
                    ),
                    const SizedBox(height: 16),
                  ],
                  
                  TextField(
                    controller: _issueController,
                    maxLines: 5,
                    enabled: _activeBookings.isNotEmpty && !_submitting,
                    decoration: InputDecoration(
                      hintText: 'Describe issue (e.g. geyser leaking, water clogging, Wifi slow...)',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      filled: true,
                      fillColor: Theme.of(context).colorScheme.surface,
                    ),
                  ),
                  
                  const SizedBox(height: 20),
                  
                  Container(
                    width: double.infinity,
                    height: 120,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.white10),
                      borderRadius: BorderRadius.circular(12),
                      color: Theme.of(context).colorScheme.surface,
                    ),
                    child: InkWell(
                      onTap: _activeBookings.isEmpty || _submitting
                          ? null
                          : () {
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Camera opened. Mock photo attached.')));
                            },
                      borderRadius: BorderRadius.circular(12),
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add_a_photo_outlined, size: 36, color: Colors.grey),
                          SizedBox(height: 8),
                          Text('Attach Photo Evidence', style: TextStyle(fontSize: 12, color: Colors.grey)),
                        ],
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: 30),
                  
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.amber.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.gavel_rounded, color: Colors.amber),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'SLA Warning: Under the Rent Lease Agreement, owners are required to acknowledge and address service breaches within 24 hours. Delayed response automatically escalates to admins.',
                            style: TextStyle(fontSize: 11, color: Colors.amber, height: 1.4),
                          ),
                        )
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 32),
                  
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: _submitting || _activeBookings.isEmpty || _issueController.text.trim().isEmpty
                          ? null
                          : () => _handleSubmit(db),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).primaryColor,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: _submitting 
                          ? const CircularProgressIndicator(color: Colors.white) 
                          : const Text('File Ticket & Initiate SLA Tracker', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}

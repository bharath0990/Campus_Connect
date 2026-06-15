import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/models.dart';
import '../services/services.dart';

class LeaseAgreementScreen extends StatefulWidget {
  final Booking booking;
  final CSUser student;
  const LeaseAgreementScreen({
    super.key,
    required this.booking,
    required this.student,
  });

  @override
  State<LeaseAgreementScreen> createState() => _LeaseAgreementScreenState();
}

class _LeaseAgreementScreenState extends State<LeaseAgreementScreen> {
  final List<Offset?> _points = [];
  bool _saving = false;

  void _signAgreement() async {
    if (_points.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign on the signature canvas first!')),
      );
      return;
    }

    setState(() {
      _saving = true;
    });

    try {
      final client = Supabase.instance.client;
      // Update booking in Supabase: status to 'Active', rental_agreement_url to 'signed'
      await client.from('bookings').update({
        'rental_agreement_url': 'signed',
        'status': 'Active',
      }).eq('id', widget.booking.id);

      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Lease Agreement signed and secured successfully!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _saving = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to sign agreement: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final primaryColor = Theme.of(context).primaryColor;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Lease Tenancy Contract'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'REALTOR TENANCY CONTRACT DEED',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, letterSpacing: 0.5),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.02),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.black12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'This document confirms a mutual contract of lease tenancy between the Room Owner and the Student named below, registered on the RoomMate network. Both parties accept the terms of rental, pricing index, and maintenance guidelines.',
                    style: TextStyle(fontSize: 13, height: 1.4, color: Colors.grey),
                  ),
                  const Divider(height: 24, color: Color(0xFFEEEEEE)),
                  _buildTermRow('Tenant Student', widget.student.name),
                  _buildTermRow('Booking Cost', '₹${widget.booking.rent} / month'),
                  _buildTermRow('Room ID Code', widget.booking.roomId),
                  _buildTermRow('Agreement Term', '11 Months (Auto-Renewable)'),
                  _buildTermRow('Lease Start Date', widget.booking.moveInDate.toString().split(' ')[0]),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              '✍️ Draw Tenant Signature',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            ),
            const SizedBox(height: 8),
            const Text(
              'Sign with your finger inside the box below to authorize the lease.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 12),
            
            // Interactive custom painter signature canvas
            Container(
              height: 180,
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.02),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: primaryColor.withOpacity(0.4), width: 1.5),
              ),
              child: GestureDetector(
                onPanUpdate: (details) {
                  setState(() {
                    _points.add(details.localPosition);
                  });
                },
                onPanEnd: (details) => _points.add(null),
                child: CustomPaint(
                  painter: SignaturePainter(_points),
                  size: Size.infinite,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  onPressed: () {
                    setState(() {
                      _points.clear();
                    });
                  },
                  icon: const Icon(Icons.clear_rounded),
                  label: const Text('Clear Signature'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _saving ? null : _signAgreement,
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: _saving
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Authorize & Sign Tenancy Lease', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTermRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: Colors.grey)),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

class SignaturePainter extends CustomPainter {
  final List<Offset?> points;
  SignaturePainter(this.points);

  @override
  void paint(Canvas canvas, Size size) {
    Paint paint = Paint()
      ..color = Colors.blue.shade900
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 3.5;
    for (int i = 0; i < points.length - 1; i++) {
      if (points[i] != null && points[i + 1] != null) {
        canvas.drawLine(points[i]!, points[i + 1]!, paint);
      }
    }
  }

  @override
  bool shouldRepaint(SignaturePainter oldDelegate) => oldDelegate.points != points;
}

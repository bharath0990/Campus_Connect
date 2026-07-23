import 'dart:math';
import 'package:flutter/material.dart';

class PaymentSuccessScreen extends StatefulWidget {
  final String bookingId;
  final int amount;
  final String transactionId;
  const PaymentSuccessScreen({
    super.key,
    required this.bookingId,
    required this.amount,
    required this.transactionId,
  });

  @override
  State<PaymentSuccessScreen> createState() => _PaymentSuccessScreenState();
}

class _PaymentSuccessScreenState extends State<PaymentSuccessScreen> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late List<Offset> _scratchPoints;
  bool _scratched = false;
  late String _randomReward;

  final List<String> _rewardsList = [
    "🎉 ₹250 Cashback on next month's rent!",
    "🍔 1 Free PG Mess Meal Voucher!",
    "☕ Free Premium PG Co-Working Day Pass!",
    "💸 ₹150 instant deposit in RoomMate Wallet!",
    "🛡️ 10% Off your security deposit!",
  ];

  @override
  void initState() {
    super.initState();
    _scratchPoints = [];
    _randomReward = _rewardsList[Random().nextInt(_rewardsList.length)];

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  void _checkScratchProgress(Size size) {
    if (_scratched) return;
    
    // Estimate scratched ratio: if user has drawn enough points across the card
    if (_scratchPoints.length > 80) {
      setState(() {
        _scratched = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Voucher claimed: $_randomReward'),
          backgroundColor: Colors.green,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeColor = Theme.of(context).primaryColor;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Receipt'),
        automaticallyImplyLeading: false,
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            const SizedBox(height: 20),
            
            // Pulsing Success Badge (Google Pay vibe)
            ScaleTransition(
              scale: Tween<double>(begin: 0.95, end: 1.05).animate(
                CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
              ),
              child: Container(
                width: 90,
                height: 90,
                decoration: const BoxDecoration(
                  color: Colors.green,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(color: Colors.greenAccent, blurRadius: 16, spreadRadius: 2),
                  ],
                ),
                child: const Icon(Icons.check_circle_outline, color: Colors.white, size: 56),
              ),
            ),
            
            const SizedBox(height: 16),
            const Text(
              'Deposit Paid Successfully!',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Booking Active • Rent Secured',
              style: TextStyle(color: Colors.grey.shade400, fontSize: 13),
            ),
            
            const SizedBox(height: 32),
            
            // Detailed Receipt Card (PhonePe layout)
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Transaction ID', style: TextStyle(color: Colors.grey, fontSize: 13)),
                        Text(widget.transactionId, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      ],
                    ),
                    const Divider(height: 24, color: Colors.white10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Booking ID', style: TextStyle(color: Colors.grey, fontSize: 13)),
                        Text('${widget.bookingId.substring(0, 18)}...', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      ],
                    ),
                    const Divider(height: 24, color: Colors.white10),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Payment Mode', style: TextStyle(color: Colors.grey, fontSize: 13)),
                        Row(
                          children: [
                            Icon(Icons.security, size: 14, color: Colors.greenAccent),
                            SizedBox(width: 4),
                            Text('Razorpay Secure', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.greenAccent)),
                          ],
                        ),
                      ],
                    ),
                    const Divider(height: 24, color: Colors.white10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Amount Paid', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
                        Text(
                          '₹${widget.amount}',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: themeColor),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 32),
            
            // Interactive Scratch Card Section (Google Pay reward)
            const Text(
              '🎁 Scratch Card Reward',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Scratch the card below to reveal your student reward voucher!',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
            ),
            const SizedBox(height: 16),
            
            // Interactive Scratch Widget
            Center(
              child: SizedBox(
                width: 250,
                height: 150,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Stack(
                    children: [
                      // Underlayer (The Reward)
                      Container(
                        color: Colors.amber.shade700,
                        padding: const EdgeInsets.all(16),
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Text('CONGRATULATIONS!', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 1.5)),
                              const SizedBox(height: 8),
                              Text(
                                _randomReward,
                                textAlign: TextAlign.center,
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ],
                          ),
                        ),
                      ),
                      
                      // Upper Mask layer (Scratch surface)
                      if (!_scratched)
                        GestureDetector(
                          onPanStart: (details) {
                            final box = context.findRenderObject() as RenderBox;
                            final localPos = box.globalToLocal(details.globalPosition);
                            setState(() {
                              _scratchPoints.add(localPos);
                            });
                          },
                          onPanUpdate: (details) {
                            final box = context.findRenderObject() as RenderBox;
                            final localPos = box.globalToLocal(details.globalPosition);
                            setState(() {
                              _scratchPoints.add(localPos);
                            });
                            _checkScratchProgress(box.size);
                          },
                          child: CustomPaint(
                            size: const Size(250, 150),
                            painter: ScratchPainter(points: _scratchPoints),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
            
            const SizedBox(height: 40),
            
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: themeColor,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () {
                  Navigator.pop(context, true);
                },
                child: const Text('Go to Hub', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

// Custom Painter for scratching overlay mask
class ScratchPainter extends CustomPainter {
  final List<Offset> points;
  ScratchPainter({required this.points});

  @override
  void paint(Canvas canvas, Size size) {
    Paint layerPaint = Paint();
    
    // Draw on offscreen layer to enable BlendMode.clear
    canvas.saveLayer(Rect.fromLTWH(0, 0, size.width, size.height), layerPaint);
    
    // Solid mask
    Paint maskPaint = Paint()..color = Colors.grey.shade600;
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(0, 0, size.width, size.height), const Radius.circular(16)),
      maskPaint,
    );
    
    // Subtext on scratch surface
    final textPainter = TextPainter(
      text: const TextSpan(
        text: 'Scratch Here 🔑',
        style: TextStyle(color: Colors.white70, fontSize: 16, fontWeight: FontWeight.bold),
      ),
      textDirection: TextDirection.ltr,
    );
    textPainter.layout();
    textPainter.paint(
      canvas,
      Offset((size.width - textPainter.width) / 2, (size.height - textPainter.height) / 2),
    );

    // Clear brush points
    Paint clearPaint = Paint()
      ..blendMode = BlendMode.clear
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 35.0
      ..style = PaintingStyle.stroke;

    for (int i = 0; i < points.length; i++) {
      canvas.drawCircle(points[i], 18.0, clearPaint);
    }

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant ScratchPainter oldDelegate) => true;
}

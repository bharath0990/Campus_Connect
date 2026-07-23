import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class CameraScanOverlay extends StatefulWidget {
  final Uint8List imageBytes;
  final VoidCallback onComplete;
  const CameraScanOverlay({super.key, required this.imageBytes, required this.onComplete});

  @override
  State<CameraScanOverlay> createState() => _CameraScanOverlayState();
}

class _CameraScanOverlayState extends State<CameraScanOverlay> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);

    Timer(const Duration(seconds: 3), () {
      widget.onComplete();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black.withValues(alpha: 0.95),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Captured Image
          Container(
            width: 320,
            height: 200,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white24, width: 2),
              image: DecorationImage(
                image: MemoryImage(widget.imageBytes),
                fit: BoxFit.cover,
              ),
            ),
          ),
          // Scanning pulse line
          AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              return Positioned(
                top: (MediaQuery.of(context).size.height / 2 - 100) + (_controller.value * 200),
                child: Container(
                  width: 330,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.greenAccent,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.greenAccent.withValues(alpha: 0.8),
                        blurRadius: 12,
                        spreadRadius: 4,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          const Positioned(
            bottom: 80,
            child: Column(
              children: [
                CircularProgressIndicator(color: Colors.greenAccent),
                SizedBox(height: 16),
                Text(
                  'AI Document Verification Scanner Active...',
                  style: TextStyle(color: Colors.white70, fontSize: 13, decoration: TextDecoration.none),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

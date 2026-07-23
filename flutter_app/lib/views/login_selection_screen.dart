import 'dart:ui';
import 'package:flutter/material.dart';
import 'login_screen.dart';

class LoginSelectionScreen extends StatefulWidget {
  const LoginSelectionScreen({super.key});

  @override
  State<LoginSelectionScreen> createState() => _LoginSelectionScreenState();
}

class _LoginSelectionScreenState extends State<LoginSelectionScreen> with SingleTickerProviderStateMixin {
  late AnimationController _glowController;
  String? _hoveredRole;

  @override
  void initState() {
    super.initState();
    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat();
  }

  @override
  void dispose() {
    _glowController.dispose();
    super.dispose();
  }

  Widget _buildGlowSphere(double size, Color color, Alignment startAlign, Alignment endAlign) {
    return AnimatedBuilder(
      animation: _glowController,
      builder: (context, child) {
        final animVal = _glowController.value;
        final align = Alignment.lerp(startAlign, endAlign, (animVal * 2 - 1).abs());
        return Align(
          alignment: align ?? startAlign,
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: color.withValues(alpha: 0.15),
                  blurRadius: size * 0.7,
                  spreadRadius: size * 0.1,
                )
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildGlassCard(
    BuildContext context, {
    required String emoji,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required String role,
  }) {
    final isHovered = _hoveredRole == role;

    return MouseRegion(
      onEnter: (_) => setState(() => _hoveredRole = role),
      onExit: (_) => setState(() => _hoveredRole = null),
      child: GestureDetector(
        onTapDown: (_) => setState(() => _hoveredRole = role),
        onTapCancel: () => setState(() => _hoveredRole = null),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => LoginScreen(role: role),
            ),
          );
        },
        child: AnimatedScale(
          scale: isHovered ? 1.03 : 1.0,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOutBack,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                padding: const EdgeInsets.all(24.0),
                decoration: BoxDecoration(
                  color: isHovered
                      ? color.withValues(alpha: 0.25)
                      : Colors.white.withValues(alpha: 0.45),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isHovered
                        ? color.withValues(alpha: 0.5)
                        : Colors.black12.withValues(alpha: 0.08),
                    width: 1.5,
                  ),
                  boxShadow: [
                    if (isHovered)
                      BoxShadow(
                        color: color.withValues(alpha: 0.15),
                        blurRadius: 20,
                        spreadRadius: -2,
                      )
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.03),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: Colors.black12.withValues(alpha: 0.04),
                        ),
                      ),
                      child: Text(
                        emoji,
                        style: const TextStyle(fontSize: 32),
                      ),
                    ),
                    const SizedBox(width: 20),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            subtitle,
                            style: TextStyle(
                              fontSize: 12.5,
                              height: 1.3,
                              color: Colors.black54,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(
                      Icons.arrow_forward_ios_rounded,
                      size: 16,
                      color: Colors.black38,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final primaryColor = Theme.of(context).primaryColor;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FC),
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Stack(
        children: [
          // Background Glow Spheres
          _buildGlowSphere(260, primaryColor, Alignment.topLeft, Alignment.centerRight),
          _buildGlowSphere(300, const Color(0xFFFF7043), Alignment.bottomRight, Alignment.centerLeft),
          _buildGlowSphere(200, const Color(0xFF1565C0), Alignment.centerRight, Alignment.topRight),

          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 30),
                  
                  // App Branding Header
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: primaryColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: primaryColor.withValues(alpha: 0.2)),
                        ),
                        child: Icon(Icons.home_work_rounded, color: primaryColor, size: 28),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'RoomMate',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                          color: Colors.black87,
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 48),
                  
                  Text(
                    'Get Started',
                    style: TextStyle(
                      fontSize: 34,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -1,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Select your account classification profile below to authenticate or register.',
                    style: TextStyle(
                      fontSize: 14.5,
                      height: 1.4,
                      color: Colors.black87.withValues(alpha: 0.6),
                    ),
                  ),
                  
                  const SizedBox(height: 48),
                  
                  // Tactical Glassmorphic Cards
                  _buildGlassCard(
                    context,
                    emoji: '📚',
                    title: 'Student Member',
                    subtitle: 'Find verified accommodation near your college, match roommates & handle payments.',
                    icon: Icons.school_rounded,
                    color: primaryColor,
                    role: 'student',
                  ),
                  
                  const SizedBox(height: 16),
                  
                  _buildGlassCard(
                    context,
                    emoji: '🏠',
                    title: 'Property Owner',
                    subtitle: 'List rental rooms or PGs, manage leases, verify student profiles & run analytics.',
                    icon: Icons.roofing_rounded,
                    color: const Color(0xFFFF7043),
                    role: 'owner',
                  ),

                  const Spacer(),
                  
                  Center(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.02),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: Colors.black.withValues(alpha: 0.05),
                            ),
                          ),
                          child: Text(
                            'RoomMate Enterprise Security Policy V2.5',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w500,
                              color: Colors.black38,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

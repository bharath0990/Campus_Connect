import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/services.dart';
import 'blocked_screen.dart';
import 'login_screen.dart';
import 'login_selection_screen.dart';
import 'onboarding_screen.dart';
import 'student_home_screen.dart';
import 'owner_dashboard_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _evaluateAuthState();
  }

  void _evaluateAuthState() async {
    await Future.delayed(const Duration(seconds: 2));
    if (!mounted) return;

    final authService = Provider.of<AuthService>(context, listen: false);
    final user = authService.currentUser;

    if (user == null) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const OnboardingScreen()),
      );
    } else {
      // Fetch user profile role and redirect
      final profile = await authService.fetchUserProfile(user.id);
      if (!mounted) return;
      
      if (profile != null) {
        if (profile.blocked) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => const BlockedScreen()),
          );
          return;
        }
        if (profile.role == 'owner') {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (_) => OwnerDashboardScreen(
                userId: profile.uid,
                name: profile.name,
              ),
            ),
          );
        } else {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => StudentHomeScreen(user: profile)),
          );
        }
      } else {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const LoginSelectionScreen()),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Background subtle gradients
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Theme.of(context).primaryColor.withOpacity(0.15),
              ),
            ),
          ),
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: Image.asset(
                    'assets/images/logo.png',
                    width: 120,
                    height: 120,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'CampusStay',
                  style: TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -1,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Find Your Perfect Student Home',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.black54,
                  ),
                ),
                const SizedBox(height: 48),
                const CircularProgressIndicator(strokeWidth: 3),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

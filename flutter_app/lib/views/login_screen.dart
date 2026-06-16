import 'dart:ui';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/models.dart';
import '../services/services.dart';
import 'blocked_screen.dart';
import 'student_home_screen.dart';
import 'owner_dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  final String role;
  const LoginScreen({super.key, required this.role});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  final _otpController = TextEditingController();
  final _newPasswordController = TextEditingController();
  
  late String _currentRole;
  bool _isSignUp = false;
  bool _isConfirmingSignUp = false;
  bool _isForgotPasswordMode = false;
  bool _isResettingPassword = false;
  bool _loading = false;
  String? _errorMsg;

  late AnimationController _glowController;
  StreamSubscription<AuthState>? _authSubscription;

  @override
  void initState() {
    super.initState();
    _currentRole = widget.role;
    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat();

    // Listen to Auth State changes (specifically for OAuth/Google callbacks)
    _authSubscription = Provider.of<AuthService>(context, listen: false).authStateChanges.listen((data) async {
      final session = data.session;
      if (session != null) {
        final user = session.user;
        final authService = Provider.of<AuthService>(context, listen: false);
        final profile = await authService.fetchUserProfile(user.id) ?? CSUser(
          uid: user.id,
          name: user.userMetadata?['full_name'] ?? user.email?.split('@')[0] ?? 'User',
          email: user.email ?? '',
          phone: user.phone ?? '',
          role: _currentRole,
          profilePic: user.userMetadata?['avatar_url'] ?? 'https://api.dicebear.com/7.x/adventurer/png?seed=${user.id}',
          verified: _currentRole == 'admin',
          verificationDocs: [],
          trustScore: 85,
          joinedDate: DateTime.now(),
          preferences: UserPreferences(
            budgetMin: 3000,
            budgetMax: 15000,
            sleepHabit: 'flexible',
            cleanliness: 'medium',
            dietary: 'any',
            socialStatus: 'medium',
          ),
          username: (user.email != null && user.email!.isNotEmpty) ? (user.email!.split('@')[0] + '_' + (user.id.length > 5 ? user.id.substring(0, 5) : user.id)) : 'user_${user.id.substring(0, 5)}',
          blocked: false,
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('🎉 Verification & Authentication Successful!'),
              backgroundColor: Colors.green,
            ),
          );
        }
        _routeToDashboard(user.id, profile.name);
      }
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    _otpController.dispose();
    _newPasswordController.dispose();
    _glowController.dispose();
    _authSubscription?.cancel();
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
                  color: color.withOpacity(0.15),
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

  void _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() {
      _loading = true;
      _errorMsg = null;
    });

    final authService = Provider.of<AuthService>(context, listen: false);

    try {
      if (_currentRole == 'admin') {
        setState(() {
          _loading = false;
          _errorMsg = 'Admin controls are disabled in Mobile client. Please log in via the React Web Panel on Port 3000.';
        });
        return;
      }

      if (_isConfirmingSignUp) {
        final verifyRes = await authService.verifySignupOTP(
          _emailController.text.trim(),
          _otpController.text.trim(),
        );
        _routeToDashboard(verifyRes.user!.id, _nameController.text.trim());
        return;
      }

      if (_isForgotPasswordMode) {
        await authService.sendPasswordResetEmail(_emailController.text.trim());
        setState(() {
          _isForgotPasswordMode = false;
          _isResettingPassword = true;
          _loading = false;
        });
        return;
      }

      if (_isResettingPassword) {
        final verifyRes = await authService.verifyPasswordResetOTP(
          _emailController.text.trim(),
          _otpController.text.trim(),
        );
        await authService.updateUserPassword(_newPasswordController.text.trim());
        _routeToDashboard(verifyRes.user!.id, _emailController.text.split('@')[0]);
        return;
      }

      if (_isSignUp) {
        final cred = await authService.registerWithEmail(
          _emailController.text.trim(),
          _passwordController.text.trim(),
          _nameController.text.trim(),
          _currentRole,
        );
        
        if (cred.session == null && cred.user != null) {
          setState(() {
            _isConfirmingSignUp = true;
            _loading = false;
          });
        } else {
          _routeToDashboard(cred.user!.id, _nameController.text.trim());
        }
      } else {
        final cred = await authService.loginWithEmail(
          _emailController.text.trim(),
          _passwordController.text.trim(),
        );
        _routeToDashboard(cred.user!.id, _emailController.text.split('@')[0]);
      }
    } catch (e) {
      setState(() {
        _loading = false;
        _errorMsg = e.toString().contains('Invalid') 
            ? 'Authentication failed: Incorrect credentials or verification code.' 
            : 'Error: $e';
      });
    }
  }

  void _checkVerificationStatus() async {
    setState(() {
      _loading = true;
      _errorMsg = null;
    });

    final authService = Provider.of<AuthService>(context, listen: false);
    try {
      final currentSessionUser = authService.currentUser;
      if (currentSessionUser != null) {
        _routeToDashboard(currentSessionUser.id, _nameController.text.trim());
      } else {
        final cred = await authService.loginWithEmail(
          _emailController.text.trim(),
          _passwordController.text.trim(),
        );
        _routeToDashboard(cred.user!.id, _nameController.text.trim());
      }
    } catch (e) {
      setState(() {
        _loading = false;
        _errorMsg = "Verification link not yet clicked. Click the link in your email to verify.";
      });
    }
  }

  void _handleGoogleLogin() async {
    setState(() {
      _loading = true;
      _errorMsg = null;
    });

    final authService = Provider.of<AuthService>(context, listen: false);
    try {
      final success = await authService.loginWithGoogle();
      if (!success) {
        setState(() {
          _loading = false;
          _errorMsg = "Google login cancelled or failed.";
        });
      }
    } catch (e) {
      setState(() {
        _loading = false;
        _errorMsg = "Google Login failed: $e";
      });
    }
  }

  void _routeToDashboard(String uid, String name) async {
    final authService = Provider.of<AuthService>(context, listen: false);
    final userProfile = await authService.fetchUserProfile(uid) ?? CSUser(
      uid: uid,
      name: name,
      email: _emailController.text,
      phone: '',
      role: _currentRole,
      profilePic: 'https://api.dicebear.com/7.x/adventurer/png?seed=$uid',
      verified: _currentRole == 'admin',
      verificationDocs: [],
      trustScore: 90,
      joinedDate: DateTime.now(),
      preferences: UserPreferences(
        budgetMin: 3000,
        budgetMax: 10000,
        sleepHabit: 'flexible',
        dietary: 'any',
        cleanliness: 'medium',
        socialStatus: 'balanced',
      ),
      username: _emailController.text.isNotEmpty ? (_emailController.text.split('@')[0] + '_' + (uid.length > 5 ? uid.substring(0, 5) : uid)) : 'user_${uid.substring(0, 5)}',
      blocked: false,
    );

    if (!mounted) return;

    if (userProfile.blocked) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const BlockedScreen()),
        (route) => false,
      );
      return;
    }

    if (_currentRole == 'owner') {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(
          builder: (_) => OwnerDashboardScreen(
            userId: uid,
            name: name,
          ),
        ),
        (route) => false,
      );
    } else {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => StudentHomeScreen(user: userProfile)),
        (route) => false,
      );
    }
  }

  InputDecoration _buildInputDecoration(BuildContext context, String labelText, IconData icon) {
    final primaryColor = Theme.of(context).primaryColor;
    return InputDecoration(
      labelText: labelText,
      prefixIcon: Icon(icon, color: Colors.black54),
      labelStyle: TextStyle(color: Colors.black87, fontSize: 14),
      filled: true,
      fillColor: Colors.black.withOpacity(0.02),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: Colors.black12.withOpacity(0.08), width: 1.5),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: primaryColor, width: 2.0),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Colors.redAccent, width: 2.0),
      ),
    );
  }

  Widget _buildRoleSegmentSelector(BuildContext context) {
    final primaryColor = Theme.of(context).primaryColor;
    
    return Container(
      height: 50,
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.03),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.black12.withOpacity(0.05)),
      ),
      child: Stack(
        children: [
          AnimatedAlign(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeOutBack,
            alignment: _currentRole == 'student' ? Alignment.centerLeft : Alignment.centerRight,
            child: FractionallySizedBox(
              widthFactor: 0.5,
              child: Container(
                margin: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: primaryColor,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: primaryColor.withOpacity(0.3),
                      blurRadius: 10,
                      spreadRadius: 1,
                    )
                  ],
                ),
              ),
            ),
          ),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => setState(() {
                    _currentRole = 'student';
                    _errorMsg = null;
                  }),
                  child: Center(
                    child: Text(
                      '📚 Student',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: _currentRole == 'student' 
                            ? Colors.white 
                            : Colors.black54,
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => setState(() {
                    _currentRole = 'owner';
                    _errorMsg = null;
                  }),
                  child: Center(
                    child: Text(
                      '🏠 Owner',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: _currentRole == 'owner' 
                            ? Colors.white 
                            : Colors.black54,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildGlassCard(BuildContext context, {required Widget child}) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.4),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: Colors.black.withOpacity(0.08),
              width: 1.5,
            ),
          ),
          child: child,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final primaryColor = Theme.of(context).primaryColor;
    
    // Header messages
    String titleText = '';
    String subtitleText = '';
    
    if (_isConfirmingSignUp) {
      titleText = 'Verify Email';
      subtitleText = 'Enter verification OTP or check your mail link.';
    } else if (_isForgotPasswordMode) {
      titleText = 'Reset Password';
      subtitleText = 'Enter your email address to receive a recovery code.';
    } else if (_isResettingPassword) {
      titleText = 'Choose Password';
      subtitleText = 'Enter recovery OTP code and your new password below.';
    } else {
      titleText = _isSignUp 
          ? 'Create Space' 
          : 'Welcome Back';
      subtitleText = 'Sign in to access your dashboard.';
    }
    
    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FC),
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black87),
          onPressed: () {
            if (_isConfirmingSignUp || _isForgotPasswordMode || _isResettingPassword) {
              setState(() {
                _isConfirmingSignUp = false;
                _isForgotPasswordMode = false;
                _isResettingPassword = false;
                _errorMsg = null;
              });
            } else {
              Navigator.pop(context);
            }
          },
        ),
      ),
      body: Stack(
        children: [
          // Background Glow Spheres
          _buildGlowSphere(280, primaryColor, Alignment.topLeft, Alignment.centerRight),
          _buildGlowSphere(320, const Color(0xFFFF7043), Alignment.bottomRight, Alignment.centerLeft),
          _buildGlowSphere(220, const Color(0xFF1565C0), Alignment.centerRight, Alignment.topRight),

          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.asset(
                          'assets/images/logo.png',
                          width: 80,
                          height: 80,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    
                    // Main Titles
                    Text(
                      titleText,
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -1,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      subtitleText,
                      style: TextStyle(
                        fontSize: 14.5,
                        color: Colors.black54,
                      ),
                    ),
                    
                    const SizedBox(height: 32),

                    // Error Banner if active
                    if (_errorMsg != null) ...[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.12),
                            border: Border.all(color: Colors.redAccent.withOpacity(0.4)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline_rounded, color: Colors.redAccent),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  _errorMsg!,
                                  style: const TextStyle(color: Colors.redAccent, fontSize: 13, height: 1.3),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],

                    // Unified Frosted Card Form
                    _buildGlassCard(
                      context,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Segment Selector
                          if (!_isConfirmingSignUp && !_isForgotPasswordMode && !_isResettingPassword) ...[
                            _buildRoleSegmentSelector(context),
                            const SizedBox(height: 24),
                          ],

                          AnimatedSwitcher(
                            duration: const Duration(milliseconds: 300),
                            child: Column(
                              key: ValueKey<String>('${_isConfirmingSignUp}_${_isForgotPasswordMode}_${_isResettingPassword}_${_isSignUp}'),
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Flow 1: Signup email confirmation
                                if (_isConfirmingSignUp) ...[
                                  const Text(
                                    'We sent a verification link to your email. Please check your inbox and click the link to verify your account.',
                                    style: TextStyle(fontSize: 14, height: 1.4, color: Colors.grey),
                                  ),
                                  const SizedBox(height: 24),
                                  SizedBox(
                                    width: double.infinity,
                                    height: 52,
                                    child: ElevatedButton(
                                      onPressed: _loading ? null : _checkVerificationStatus,
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: primaryColor,
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                      ),
                                      child: _loading 
                                          ? const CircularProgressIndicator(color: Colors.white)
                                          : const Text('I Clicked the Mail Link', style: TextStyle(fontWeight: FontWeight.bold)),
                                    ),
                                  ),
                                ]
                                // Flow 2: Forgot Password email entry
                                else if (_isForgotPasswordMode) ...[
                                  TextFormField(
                                    controller: _emailController,
                                    keyboardType: TextInputType.emailAddress,
                                    decoration: _buildInputDecoration(context, 'Email Address', Icons.mail_outline_rounded),
                                    validator: (v) => v == null || !v.contains('@') ? 'Enter a valid email' : null,
                                  ),
                                  const SizedBox(height: 24),
                                  SizedBox(
                                    width: double.infinity,
                                    height: 52,
                                    child: ElevatedButton(
                                      onPressed: _loading ? null : _handleSubmit,
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: primaryColor,
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                      ),
                                      child: _loading 
                                          ? const CircularProgressIndicator(color: Colors.white)
                                          : const Text('Send Recovery Code', style: TextStyle(fontWeight: FontWeight.bold)),
                                    ),
                                  ),
                                ]
                                // Flow 3: Reset password OTP & New password entry
                                else if (_isResettingPassword) ...[
                                  TextFormField(
                                    controller: _otpController,
                                    keyboardType: TextInputType.number,
                                    decoration: _buildInputDecoration(context, 'Recovery Code', Icons.pin_rounded),
                                    validator: (v) => v == null || v.trim().length != 6 ? 'Enter the 6-digit code' : null,
                                  ),
                                  const SizedBox(height: 16),
                                  TextFormField(
                                    controller: _newPasswordController,
                                    obscureText: true,
                                    decoration: _buildInputDecoration(context, 'New Password', Icons.lock_outline_rounded),
                                    validator: (v) => v == null || v.length < 6 ? 'Password must exceed 5 chars' : null,
                                  ),
                                  const SizedBox(height: 24),
                                  SizedBox(
                                    width: double.infinity,
                                    height: 52,
                                    child: ElevatedButton(
                                      onPressed: _loading ? null : _handleSubmit,
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: primaryColor,
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                      ),
                                      child: _loading 
                                          ? const CircularProgressIndicator(color: Colors.white)
                                          : const Text('Reset & Login', style: TextStyle(fontWeight: FontWeight.bold)),
                                    ),
                                  ),
                                ]
                                // Flow 4: Normal Login or SignUp
                                else ...[
                                  if (_isSignUp) ...[
                                    TextFormField(
                                      controller: _nameController,
                                      decoration: _buildInputDecoration(context, 'Full Name', Icons.person_outline_rounded),
                                      validator: (v) => v == null || v.isEmpty ? 'Field is required' : null,
                                    ),
                                    const SizedBox(height: 16),
                                  ],

                                  TextFormField(
                                    controller: _emailController,
                                    keyboardType: TextInputType.emailAddress,
                                    decoration: _buildInputDecoration(context, 'Email Address', Icons.mail_outline_rounded),
                                    validator: (v) => v == null || !v.contains('@') ? 'Enter a valid email' : null,
                                  ),
                                  const SizedBox(height: 16),
                                  TextFormField(
                                    controller: _passwordController,
                                    obscureText: true,
                                    decoration: _buildInputDecoration(context, 'Password', Icons.lock_outline_rounded),
                                    validator: (v) {
                                      if (v == null || v.isEmpty) return 'Field is required';
                                      if (_isSignUp) {
                                        if (v.length < 8) return 'Password must be at least 8 characters';
                                        if (!v.contains(RegExp(r'[a-z]')) ||
                                            !v.contains(RegExp(r'[A-Z]')) ||
                                            !v.contains(RegExp(r'[0-9!@#\$%^&*(),.?":{}|<>]'))) {
                                          return 'Must include uppercase, lowercase, and a number/special char';
                                        }
                                      }
                                      return null;
                                    },
                                  ),
                                  
                                  if (!_isSignUp) ...[
                                    Align(
                                      alignment: Alignment.centerRight,
                                      child: TextButton(
                                        onPressed: () {
                                          setState(() {
                                            _isForgotPasswordMode = true;
                                            _errorMsg = null;
                                          });
                                        },
                                        child: Text(
                                          'Forgot Password?',
                                          style: TextStyle(color: primaryColor, fontSize: 13, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ),
                                  ],

                                  const SizedBox(height: 16),

                                  SizedBox(
                                    width: double.infinity,
                                    height: 52,
                                    child: ElevatedButton(
                                      onPressed: _loading ? null : _handleSubmit,
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: primaryColor,
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                        elevation: 2,
                                        shadowColor: primaryColor.withOpacity(0.3),
                                      ),
                                      child: _loading 
                                          ? const CircularProgressIndicator(color: Colors.white) 
                                          : Text(
                                              _isSignUp ? 'Create Account' : 'Authenticate Access',
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                            ),
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  const Row(
                                    children: [
                                      Expanded(child: Divider()),
                                      Padding(
                                        padding: EdgeInsets.symmetric(horizontal: 16),
                                        child: Text('OR', style: TextStyle(color: Colors.grey, fontSize: 12)),
                                      ),
                                      Expanded(child: Divider()),
                                    ],
                                  ),
                                  const SizedBox(height: 16),
                                  SizedBox(
                                    width: double.infinity,
                                    height: 52,
                                    child: OutlinedButton.icon(
                                      onPressed: _loading ? null : _handleGoogleLogin,
                                      style: OutlinedButton.styleFrom(
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                        side: BorderSide(color: Colors.grey.shade300),
                                      ),
                                      icon: Image.network(
                                        'https://www.gstatic.com/images/branding/product/1x/gsa_android_64dp.png',
                                        height: 20,
                                        errorBuilder: (c, o, s) => const Icon(Icons.g_mobiledata, color: Colors.blueAccent),
                                      ),
                                      label: const Text(
                                        'Continue with Google',
                                        style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87),
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          
                          // Bottom switch options inside card
                          if (!_isConfirmingSignUp && !_isForgotPasswordMode && !_isResettingPassword) ...[
                            const SizedBox(height: 16),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  _isSignUp ? 'Already have an account?' : 'Need an account?',
                                  style: TextStyle(color: Colors.black54, fontSize: 13.5),
                                ),
                                TextButton(
                                  onPressed: () {
                                    setState(() {
                                      _isSignUp = !_isSignUp;
                                    });
                                  },
                                  child: Text(
                                    _isSignUp ? 'Log In' : 'Sign Up',
                                    style: TextStyle(color: primaryColor, fontWeight: FontWeight.bold, fontSize: 13.5),
                                  ),
                                ),
                              ],
                            ),

                          ],
                        ],
                      ),
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
}

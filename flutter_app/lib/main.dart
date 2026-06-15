import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'services/services.dart';
import 'views/splash_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  bool supabaseRunning = true;
  try {
    await Supabase.initialize(
      url: 'https://qynghqgbitcbczvfervg.supabase.co',
      anonKey: 'sb_publishable_u63gxFokU3EOzGIPFIIXCg_R0TTYaxt',
    );
  } catch (e) {
    supabaseRunning = false;
    debugPrint("Supabase Client initialization error. Developing in Mock Repositories.");
  }

  runApp(CampusStayApp(supabaseRunning: supabaseRunning));
}

class CampusStayApp extends StatelessWidget {
  final bool supabaseRunning;
  const CampusStayApp({super.key, this.supabaseRunning = true});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<AuthService>(create: (_) => AuthService()),
        Provider<SupabaseService>(create: (_) => SupabaseService()),
        Provider<ChatService>(create: (_) => ChatService()),
        Provider<PaymentService>(create: (_) => PaymentService()),
        Provider<GoogleMapsService>(create: (_) => GoogleMapsService()),
        Provider<AadhaarVerificationService>(create: (_) => AadhaarVerificationService()),
        Provider<BankPaymentService>(create: (_) => BankPaymentService()),
        Provider<EmailService>(create: (_) => EmailService()),
        Provider<bool>.value(value: supabaseRunning),
      ],
      child: MaterialApp(
        title: 'RoomMate',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          brightness: Brightness.light,
          scaffoldBackgroundColor: const Color(0xFFFAFAFA),
          primaryColor: const Color(0xFFD32F2F),
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFFD32F2F),
            brightness: Brightness.light,
            primary: const Color(0xFFD32F2F),
            secondary: const Color(0xFFE53935),
            onPrimary: Colors.white,
            surface: Colors.white,
            background: const Color(0xFFFAFAFA),
          ),
          fontFamily: 'Outfit',
          appBarTheme: const AppBarTheme(
            backgroundColor: Colors.white,
            foregroundColor: Color(0xFFD32F2F),
            elevation: 0,
          ),
          cardTheme: CardThemeData(
            color: Colors.white,
            elevation: 2,
            shape: RoundedRectangleBorder(
              side: const BorderSide(color: Color(0xFFEEEEEE)),
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
        themeMode: ThemeMode.light,
        home: const SplashScreen(),
      ),
    );
  }
}

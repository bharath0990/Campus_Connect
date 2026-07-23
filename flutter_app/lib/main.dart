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
      publishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5bmdocWdiaXRjYmN6dmZlcnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODQwMjQsImV4cCI6MjA5NjE2MDAyNH0.Bu5Zb5a9y2_mUfTB9TaPW1_fgPRce4VzLPgwWjucwJg',
    );
  } catch (e) {
    supabaseRunning = false;
    debugPrint("Supabase Client initialization error. Developing in Mock Repositories.");
  }

  runApp(CampusStayApp(supabaseRunning: supabaseRunning));
}

class CampusStayApp extends StatelessWidget {
  final bool supabaseRunning;
  final AuthService? authService;
  final SupabaseService? supabaseService;
  final ChatService? chatService;
  final PaymentService? paymentService;
  final GoogleMapsService? googleMapsService;
  final AadhaarVerificationService? aadhaarVerificationService;
  final BankPaymentService? bankPaymentService;
  final EmailService? emailService;

  const CampusStayApp({
    super.key,
    this.supabaseRunning = true,
    this.authService,
    this.supabaseService,
    this.chatService,
    this.paymentService,
    this.googleMapsService,
    this.aadhaarVerificationService,
    this.bankPaymentService,
    this.emailService,
  });

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<AuthService>(create: (_) => authService ?? AuthService()),
        Provider<SupabaseService>(create: (_) => supabaseService ?? SupabaseService()),
        Provider<ChatService>(create: (_) => chatService ?? ChatService()),
        Provider<PaymentService>(create: (_) => paymentService ?? PaymentService()),
        Provider<GoogleMapsService>(create: (_) => googleMapsService ?? GoogleMapsService()),
        Provider<AadhaarVerificationService>(create: (_) => aadhaarVerificationService ?? AadhaarVerificationService()),
        Provider<BankPaymentService>(create: (_) => bankPaymentService ?? BankPaymentService()),
        Provider<EmailService>(create: (_) => emailService ?? EmailService()),
        Provider<bool>.value(value: supabaseRunning),
      ],
      child: MaterialApp(
        title: 'RoomMate',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          splashFactory: InkRipple.splashFactory,
          brightness: Brightness.light,
          scaffoldBackgroundColor: const Color(0xFFFAFAFA),
          primaryColor: const Color(0xFFD32F2F),
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFFD32F2F),
            brightness: Brightness.light,
            primary: const Color(0xFFD32F2F),
            secondary: const Color(0xFFE53935),
            onPrimary: Colors.white,
            surface: const Color(0xFFFAFAFA),
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

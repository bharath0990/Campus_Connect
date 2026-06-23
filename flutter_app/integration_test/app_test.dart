import 'dart:io' as io;
import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:campus_stay/main.dart' as app;
import 'package:campus_stay/services/services.dart';
import 'package:campus_stay/models/models.dart';

// --- MOCK SERVICES DEFINITIONS ---

class MockAuthService extends AuthService {
  User? _currentUser;
  final _authStateController = StreamController<AuthState>.broadcast();

  @override
  Stream<AuthState> get authStateChanges => _authStateController.stream;

  @override
  User? get currentUser => _currentUser;

  @override
  Future<AuthResponse> loginWithEmail(String email, String password) async {
    final user = User(
      id: 'mock_uid_${email.split('@')[0]}',
      appMetadata: {},
      userMetadata: {
        'name': email.split('@')[0],
        'role': email.contains('owner') ? 'owner' : 'student',
      },
      aud: 'authenticated',
      createdAt: DateTime.now().toIso8601String(),
      email: email,
    );
    _currentUser = user;
    _authStateController.add(AuthState(AuthChangeEvent.signedIn, Session(
      accessToken: 'mock_token',
      tokenType: 'bearer',
      user: user,
    )));
    return AuthResponse(
      session: Session(
        accessToken: 'mock_token',
        tokenType: 'bearer',
        user: user,
      ),
      user: user,
    );
  }

  @override
  Future<AuthResponse> registerWithEmail(String email, String password, String name, String role) async {
    final user = User(
      id: 'mock_uid_${email.split('@')[0]}',
      appMetadata: {},
      userMetadata: {
        'name': name,
        'role': role,
      },
      aud: 'authenticated',
      createdAt: DateTime.now().toIso8601String(),
      email: email,
    );
    _currentUser = user;
    _authStateController.add(AuthState(AuthChangeEvent.signedIn, Session(
      accessToken: 'mock_token',
      tokenType: 'bearer',
      user: user,
    )));
    return AuthResponse(
      session: Session(
        accessToken: 'mock_token',
        tokenType: 'bearer',
        user: user,
      ),
      user: user,
    );
  }

  @override
  Future<void> signOut() async {
    _currentUser = null;
    _authStateController.add(AuthState(AuthChangeEvent.signedOut, null));
  }

  @override
  Future<CSUser?> fetchUserProfile(String uid) async {
    return CSUser(
      uid: uid,
      name: uid.contains('owner') ? 'Owner E2E' : 'Student E2E',
      email: '$uid@example.com',
      phone: '9876543210',
      role: uid.contains('owner') ? 'owner' : 'student',
      profilePic: 'https://api.dicebear.com/7.x/adventurer/png?seed=$uid',
      verified: true,
      verificationDocs: [],
      trustScore: 90,
      joinedDate: DateTime.now(),
      preferences: UserPreferences(
        budgetMin: 3000,
        budgetMax: 15000,
        sleepHabit: 'flexible',
        dietary: 'any',
        cleanliness: 'medium',
        socialStatus: 'medium',
      ),
      username: uid.replaceAll('mock_uid_', ''),
      blocked: false,
    );
  }

  @override
  Future<void> updateUserProfile(CSUser user) async {}

  @override
  Stream<CSUser?> streamUserProfile(String uid) async* {
    yield CSUser(
      uid: uid,
      name: uid.contains('owner') ? 'Owner E2E' : 'Student E2E',
      email: '$uid@example.com',
      phone: '9876543210',
      role: uid.contains('owner') ? 'owner' : 'student',
      profilePic: 'https://api.dicebear.com/7.x/adventurer/png?seed=$uid',
      verified: true,
      verificationDocs: [],
      trustScore: 90,
      joinedDate: DateTime.now(),
      preferences: UserPreferences(
        budgetMin: 3000,
        budgetMax: 15000,
        sleepHabit: 'flexible',
        dietary: 'any',
        cleanliness: 'medium',
        socialStatus: 'medium',
      ),
      username: uid.replaceAll('mock_uid_', ''),
      blocked: false,
    );
  }
}

class MockSupabaseService extends SupabaseService {
  final List<Room> _rooms = [];
  final List<Booking> _bookings = [];
  final List<Map<String, dynamic>> _notifications = [];
  final List<String> _friends = [];
  final List<String> _pendingRequestsReceived = [];
  final List<String> _pendingRequestsSent = [];

  final _roomsController = StreamController<List<Room>>.broadcast();
  final _bookingsController = StreamController<List<Booking>>.broadcast();
  final _notificationsController = StreamController<List<Map<String, dynamic>>>.broadcast();

  MockSupabaseService() {
    _rooms.addAll([
      Room(
        id: 'room_1',
        ownerId: 'mock_owner_id',
        title: 'Premium Co-Living Flat (Double Occupancy)',
        description: 'Mock co-living luxury flat near BITS campus',
        city: 'Panaji',
        detailedAddress: 'Near BITS campus, Altinho, Goa',
        rent: 12000,
        deposit: 24000,
        amenities: ['WiFi', 'AC', 'Maid'],
        images: ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af'],
        available: true,
        verified: true,
        rating: 4.8,
        capacity: 2,
      ),
    ]);
  }

  void _notifyRooms() {
    _roomsController.add(List.from(_rooms));
  }

  @override
  Stream<List<Room>> streamRooms({String? city, int? maxPrice}) async* {
    yield _rooms.where((room) {
      if (city != null && city.isNotEmpty && !room.city.toLowerCase().contains(city.toLowerCase())) {
        return false;
      }
      if (maxPrice != null && room.rent > maxPrice) {
        return false;
      }
      return true;
    }).toList();
    yield* _roomsController.stream.map((list) {
      return list.where((room) {
        if (city != null && city.isNotEmpty && !room.city.toLowerCase().contains(city.toLowerCase())) {
          return false;
        }
        if (maxPrice != null && room.rent > maxPrice) {
          return false;
        }
        return true;
      }).toList();
    });
  }

  @override
  Stream<List<Room>> streamOwnerRooms(String ownerId) async* {
    yield _rooms.where((room) => room.ownerId == ownerId).toList();
    yield* _roomsController.stream.map((list) {
      return list.where((room) => room.ownerId == ownerId).toList();
    });
  }

  @override
  Future<void> createRoom(Room room) async {
    final newRoom = Room(
      id: room.id.isEmpty ? 'room_${DateTime.now().millisecondsSinceEpoch}' : room.id,
      ownerId: room.ownerId.isEmpty ? 'mock_uid_owner' : room.ownerId,
      title: room.title,
      description: room.description,
      city: room.city,
      detailedAddress: room.detailedAddress,
      rent: room.rent,
      deposit: room.deposit,
      amenities: room.amenities,
      images: room.images.isEmpty ? ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af'] : room.images,
      available: room.available,
      verified: true,
      rating: room.rating,
      capacity: room.capacity,
    );
    _rooms.add(newRoom);
    _notifyRooms();
  }

  @override
  Stream<List<Booking>> streamBookings(String userId, bool isOwner) async* {
    yield _bookings.where((b) => isOwner ? (b.ownerId == userId) : (b.studentId == userId)).toList();
    yield* _bookingsController.stream.map((list) {
      return list.where((b) => isOwner ? (b.ownerId == userId) : (b.studentId == userId)).toList();
    });
  }

  @override
  Stream<List<Map<String, dynamic>>> streamUserNotifications(String userId) async* {
    yield _notifications;
    yield* _notificationsController.stream;
  }

  @override
  Future<void> markAllNotificationsAsRead(String userId) async {
    for (var n in _notifications) {
      n['read'] = true;
    }
    _notificationsController.add(List.from(_notifications));
  }

  @override
  Future<List<Map<String, dynamic>>> matchRoommates(CSUser user) async {
    return [
      {
        'uid': 'mock_student_felix',
        'name': 'Felix Carter',
        'email': 'felix@example.com',
        'avatar': 'https://api.dicebear.com/7.x/adventurer/png?seed=Felix',
        'college': 'RoomMate Student',
        'trustScore': 92,
        'matchPercentage': 90,
        'sleepHabit': 'night',
        'cleanliness': 'medium',
        'dietary': 'veg',
      }
    ];
  }

  @override
  Stream<List<String>> streamFriends(String userId) {
    return Stream.value(_friends);
  }

  @override
  Stream<List<String>> streamPendingRequestsReceived(String userId) {
    return Stream.value(_pendingRequestsReceived);
  }

  @override
  Stream<List<String>> streamPendingRequestsSent(String userId) {
    return Stream.value(_pendingRequestsSent);
  }

  @override
  Future<List<Map<String, dynamic>>> getRoomReviews(String roomId) async {
    return [];
  }

  @override
  Future<Map<String, dynamic>> suggestOptimalPrice({
    required String city,
    required int currentPrice,
    required List<String> amenities,
  }) async {
    return {
      'averageMarketPrice': 11000,
      'suggestedOptimalPrice': 12000,
      'pricingStatus': 'Optimal',
      'priceDifferencePercent': 0,
      'tips': ['Price is optimal for Altinho, Goa.']
    };
  }

  @override
  Stream<List<Map<String, dynamic>>> streamOwnerDeletionRequests(String ownerId) {
    return Stream.value([]);
  }

  @override
  Stream<List<MaintenanceTicket>> streamTickets(String userId, bool isOwner) {
    return Stream.value([]);
  }
}

class MockChatService extends ChatService {
  final List<Map<String, dynamic>> _chats = [];
  final List<ChatMessage> _messages = [];

  final _chatsController = StreamController<List<Map<String, dynamic>>>.broadcast();
  final _messagesController = StreamController<List<ChatMessage>>.broadcast();

  @override
  Future<String> getOrCreateChatRoom(String studentId, String ownerId, String roomTitle) async {
    final roomId = '${studentId}_${ownerId}';
    final chatExists = _chats.any((c) => c['id'] == roomId);
    if (!chatExists) {
      _chats.add({
        'id': roomId,
        'participants': [studentId, ownerId],
        'last_message': 'Inquiry started for $roomTitle',
        'last_message_at': DateTime.now().toIso8601String(),
      });
      _chatsController.add(List.from(_chats));
    }
    return roomId;
  }

  @override
  Stream<List<ChatMessage>> streamMessages(String chatRoomId) async* {
    yield _messages.where((m) => m.id.startsWith(chatRoomId) || m.senderId == chatRoomId).toList();
    yield* _messagesController.stream.map((list) {
      return list.where((m) => m.id.startsWith(chatRoomId) || m.senderId == chatRoomId).toList();
    });
  }

  @override
  Future<void> sendMessage(String chatRoomId, String senderId, String senderName, String text, {String? imageUrl}) async {
    final msg = ChatMessage(
      id: '${chatRoomId}_${DateTime.now().millisecondsSinceEpoch}',
      senderId: senderId,
      senderName: senderName,
      text: text,
      createdAt: DateTime.now(),
      imageUrl: imageUrl,
    );
    _messages.add(msg);
    _messagesController.add(List.from(_messages));

    final idx = _chats.indexWhere((c) => c['id'] == chatRoomId);
    if (idx != -1) {
      _chats[idx]['last_message'] = text;
      _chats[idx]['last_message_at'] = DateTime.now().toIso8601String();
      _chatsController.add(List.from(_chats));
    }
  }

  @override
  Stream<List<Map<String, dynamic>>> streamUserChats(String userId) async* {
    yield _chats.where((c) {
      final parts = c['participants'] as List;
      return parts.contains(userId);
    }).toList();
    yield* _chatsController.stream.map((list) {
      return list.where((c) {
        final parts = c['participants'] as List;
        return parts.contains(userId);
      }).toList();
    });
  }

  @override
  Stream<int> streamUnreadCount(String chatRoomId, String currentUserId) {
    return Stream.value(0);
  }

  @override
  Stream<int> streamTotalUnreadCount(String currentUserId) {
    return Stream.value(0);
  }
}

// --- TEST WORKFLOW ---

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('CampusStay App E2E Test Suite', () {
    final String timestamp = DateTime.now().millisecondsSinceEpoch.toString();
    final String studentEmail = 'student_$timestamp@campusstay.com';
    final String studentName = 'Student E2E $timestamp';
    final String ownerEmail = 'owner_$timestamp@campusstay.com';
    final String ownerName = 'Owner E2E $timestamp';
    const String password = 'Password123!';

    setUpAll(() async {
      io.HttpOverrides.global = MockHttpOverrides();

      // Initialize Supabase once so that classes accessing Supabase.instance.client don't assert
      try {
        await Supabase.initialize(
          url: 'https://qynghqgbitcbczvfervg.supabase.co',
          anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5bmdocWdiaXRjYmN6dmZlcnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODQwMjQsImV4cCI6MjA5NjE2MDAyNH0.Bu5Zb5a9y2_mUfTB9TaPW1_fgPRce4VzLPgwWjucwJg',
        );
      } catch (e) {
        // Suppress already initialized errors
      }

      final tempDir = io.Directory.systemTemp;
      final file = io.File('${tempDir.path}/test_image.jpg');
      await file.writeAsBytes(List.generate(100, (index) => index));

      // Mock SharedPreferences platform channel method calls
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
        const MethodChannel('plugins.flutter.io/shared_preferences'),
        (MethodCall methodCall) async {
          if (methodCall.method == 'getAll') {
            return <String, dynamic>{};
          }
          return null;
        },
      );

      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
        const MethodChannel('plugins.flutter.io/image_picker'),
        (MethodCall methodCall) async {
          return file.path;
        },
      );
    });

    testWidgets('CampusStay App Complete E2E Workflow', (WidgetTester tester) async {
      // Set device screen size for headless execution to avoid layouts overflow/clipping
      tester.binding.window.physicalSizeTestValue = const Size(1080, 2400);
      tester.binding.window.devicePixelRatioTestValue = 1.0;
      try {
        tester.view.physicalSize = const Size(1080, 2400);
        tester.view.devicePixelRatio = 1.0;
      } catch (e) {}

      Future<void> safeSettle([int seconds = 1]) async {
        await tester.pump(Duration(seconds: seconds));
        await tester.pump(const Duration(milliseconds: 500));
      }

      print('=== E2E TEST: Booting App ===');
      final mockAuth = MockAuthService();
      final mockDb = MockSupabaseService();
      final mockChat = MockChatService();

      // Boot app using mocked services
      await tester.pumpWidget(app.CampusStayApp(
        supabaseRunning: true,
        authService: mockAuth,
        supabaseService: mockDb,
        chatService: mockChat,
      ));
      await tester.pump();
      await safeSettle(3); // Wait for splash screen fade

      // 2. Onboarding Screen - Skip to Login Selection
      print('=== E2E TEST: Onboarding Skip ===');
      final skipBtn = find.text('Skip');
      expect(skipBtn, findsOneWidget);
      await tester.tap(skipBtn);
      await safeSettle(1);

      // Verify we navigated to LoginSelectionScreen
      expect(find.text('Get Started'), findsOneWidget);

      // 3. Navigate to Student Login
      print('=== E2E TEST: Student Login Navigation ===');
      await tester.tap(find.text('Student Member'));
      await safeSettle(1);

      // Verify we are on LoginScreen
      expect(find.text('Welcome Back'), findsOneWidget);

      // Switch to Sign Up mode
      print('=== E2E TEST: Switch to Student Sign Up ===');
      final signUpTextBtn = find.widgetWithText(TextButton, 'Sign Up');
      expect(signUpTextBtn, findsOneWidget);
      await tester.tap(signUpTextBtn);
      await safeSettle(1);

      // Fill Student Signup Info
      print('=== E2E TEST: Filling Student Info ===');
      final nameField = find.ancestor(of: find.text('Full Name'), matching: find.byType(TextFormField));
      final emailField = find.ancestor(of: find.text('Email Address'), matching: find.byType(TextFormField));
      final passwordField = find.ancestor(of: find.text('Password'), matching: find.byType(TextFormField));

      await tester.enterText(nameField, studentName);
      await tester.enterText(emailField, studentEmail);
      await tester.enterText(passwordField, password);
      await safeSettle(1);

      // Unfocus and scroll to make button hit-testable
      FocusManager.instance.primaryFocus?.unfocus();
      await safeSettle(1);
      final createAccountBtn = find.widgetWithText(ElevatedButton, 'Create Account');
      await tester.ensureVisible(createAccountBtn);
      await safeSettle(1);

      // Tap Create Account
      print('=== E2E TEST: Tap Create Account ===');
      await tester.tap(createAccountBtn);
      await safeSettle(4);

      // Since MockAuthService returns session immediately, we skip the Verify Email page and go straight to Student Dashboard
      
      // 4. Student Dashboard Tabs & Chat UI Navigation
      // Find "Matches" tab in BottomNavigationBar
      print('=== E2E TEST: Navigate Matches Tab ===');
      final matchesTab = find.text('Matches');
      expect(matchesTab, findsOneWidget);
      await tester.tap(matchesTab);
      await safeSettle(2);

      // Find "Rent Feed" tab
      print('=== E2E TEST: Navigate Rent Feed Tab ===');
      final rentFeedTab = find.text('Rent Feed');
      expect(rentFeedTab, findsOneWidget);
      await tester.tap(rentFeedTab);
      await safeSettle(2);

      // Find "Messages" tab
      print('=== E2E TEST: Navigate Messages Tab ===');
      final messagesTab = find.text('Messages');
      expect(messagesTab, findsOneWidget);
      await tester.tap(messagesTab);
      await safeSettle(2);

      // Navigate to "Profile" tab to log out
      print('=== E2E TEST: Navigate Profile Tab ===');
      final profileTab = find.text('Profile');
      expect(profileTab, findsOneWidget);
      await tester.tap(profileTab);
      await safeSettle(2);

      // Scroll and find Logout button
      print('=== E2E TEST: Logging Out ===');
      final logoutBtn = find.widgetWithText(OutlinedButton, 'Logout Session');
      await tester.ensureVisible(logoutBtn);
      await safeSettle(1);
      await tester.tap(logoutBtn);
      await safeSettle(2);

      // 5. Navigate to Property Owner Flow
      print('=== E2E TEST: Navigate to Owner Flow ===');
      expect(find.text('Get Started'), findsOneWidget);
      await tester.tap(find.text('Property Owner'));
      await safeSettle(1);

      // Switch to Sign Up mode
      print('=== E2E TEST: Switch to Owner Sign Up ===');
      final ownerSignUpTextBtn = find.widgetWithText(TextButton, 'Sign Up');
      await tester.tap(ownerSignUpTextBtn);
      await safeSettle(1);

      // Fill Owner Signup Info
      print('=== E2E TEST: Filling Owner Info ===');
      final ownerNameField = find.ancestor(of: find.text('Full Name'), matching: find.byType(TextFormField));
      final ownerEmailField = find.ancestor(of: find.text('Email Address'), matching: find.byType(TextFormField));
      final ownerPasswordField = find.ancestor(of: find.text('Password'), matching: find.byType(TextFormField));

      await tester.enterText(ownerNameField, ownerName);
      await tester.enterText(ownerEmailField, ownerEmail);
      await tester.enterText(ownerPasswordField, password);
      await safeSettle(1);

      // Unfocus and scroll to make button hit-testable
      FocusManager.instance.primaryFocus?.unfocus();
      await safeSettle(1);
      final ownerCreateAccountBtn = find.widgetWithText(ElevatedButton, 'Create Account');
      await tester.ensureVisible(ownerCreateAccountBtn);
      await safeSettle(1);

      // Tap Create Account
      print('=== E2E TEST: Tap Owner Create Account ===');
      await tester.tap(ownerCreateAccountBtn);
      await safeSettle(4);

      // 6. Owner Dashboard Navigation & Add PG Flat Listing
      // Find "Add Room" button
      print('=== E2E TEST: Click Add Room Button ===');
      final addRoomBtn = find.text('Add Room');
      expect(addRoomBtn, findsOneWidget);
      await tester.tap(addRoomBtn);
      await safeSettle(1);

      // Fill Add Real-Time Room Dialog Form
      print('=== E2E TEST: Filling Room Form ===');
      final dialog = find.byType(AlertDialog);
      final titleInput = find.descendant(of: dialog, matching: find.ancestor(of: find.text('Title'), matching: find.byType(TextFormField)));
      final descInput = find.descendant(of: dialog, matching: find.ancestor(of: find.text('Description'), matching: find.byType(TextFormField)));
      final cityInput = find.descendant(of: dialog, matching: find.ancestor(of: find.text('City'), matching: find.byType(TextFormField)));
      final addressInput = find.descendant(of: dialog, matching: find.ancestor(of: find.text('Detailed Address'), matching: find.byType(TextFormField)));
      final rentInput = find.descendant(of: dialog, matching: find.ancestor(of: find.text('Rent per month (₹)'), matching: find.byType(TextFormField)));
      final depositInput = find.descendant(of: dialog, matching: find.ancestor(of: find.text('Security Deposit (₹)'), matching: find.byType(TextFormField)));

      await tester.enterText(titleInput, 'Premium Co-Living Flat A');
      await tester.enterText(descInput, 'Co-living luxury flat near BITS campus');
      await tester.enterText(cityInput, 'Panaji');
      await tester.enterText(addressInput, 'Near BITS campus, Altinho, Goa');
      await tester.enterText(rentInput, '12000');
      await tester.enterText(depositInput, '24000');
      await safeSettle(1);

      // Dismiss keyboard to expose dialog buttons
      FocusManager.instance.primaryFocus?.unfocus();
      await safeSettle(1);

      // Tap Pick Room Image
      print('=== E2E TEST: Tap Pick Room Image ===');
      final pickImageBtn = find.descendant(of: dialog, matching: find.widgetWithText(ElevatedButton, 'Pick Room Image'));
      await tester.ensureVisible(pickImageBtn);
      await tester.tap(pickImageBtn);
      await safeSettle(2);

      // Tap Add Room button in Dialog to submit
      print('=== E2E TEST: Tap Add Room Submit ===');
      final submitRoomBtn = find.descendant(of: dialog, matching: find.widgetWithText(ElevatedButton, 'Add Room'));
      await tester.ensureVisible(submitRoomBtn);
      await tester.tap(submitRoomBtn);
      await safeSettle(4);

      // Verify the flat list displays the new PG Flat
      print('=== E2E TEST: Verifying Listing exists ===');
      expect(find.text('Premium Co-Living Flat A'), findsOneWidget);
      print('=== E2E TEST: Complete Workflow Successful! ===');
    });
  });
}

// --- HTTP NETWORK OVERRIDES FOR HEADLESS WEB AND IMAGE LOADING ---
class MockHttpOverrides extends io.HttpOverrides {
  @override
  io.HttpClient createHttpClient(io.SecurityContext? context) {
    return MockHttpClient();
  }
}

class MockHttpClient implements io.HttpClient {
  @override
  dynamic noSuchMethod(Invocation invocation) {
    if (invocation.memberName == #getUrl || 
        invocation.memberName == #openUrl || 
        invocation.memberName == #open ||
        invocation.memberName == #get ||
        invocation.memberName == #post ||
        invocation.memberName == #postUrl ||
        invocation.memberName == #put ||
        invocation.memberName == #putUrl ||
        invocation.memberName == #delete ||
        invocation.memberName == #deleteUrl ||
        invocation.memberName == #head ||
        invocation.memberName == #headUrl ||
        invocation.memberName == #patch ||
        invocation.memberName == #patchUrl) {
      return Future.value(MockHttpClientRequest());
    }
    return null;
  }
}

class MockHttpClientRequest implements io.HttpClientRequest {
  @override
  io.HttpHeaders get headers => MockHttpHeaders();

  @override
  Future<io.HttpClientResponse> get done => Future.value(MockHttpClientResponse());

  @override
  Future<io.HttpClientResponse> close() {
    return Future.value(MockHttpClientResponse());
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class MockHttpHeaders implements io.HttpHeaders {
  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class MockHttpClientResponse extends Stream<List<int>> implements io.HttpClientResponse {
  static const List<int> _transparentImage = [
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
    0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ];

  @override
  int get statusCode => 200;
  @override
  int get contentLength => _transparentImage.length;
  @override
  io.HttpHeaders get headers => MockHttpHeaders();

  @override
  Future<io.HttpClientResponse> redirect([String? method, Uri? url, bool? followRedirects]) =>
      Future.value(this);

  @override
  StreamSubscription<List<int>> listen(
      void Function(List<int> event)? onData, {
        Function? onError,
        void Function()? onDone,
        bool? cancelOnError,
      }) {
    return Stream<List<int>>.fromIterable([_transparentImage]).listen(
      onData,
      onError: onError,
      onDone: onDone,
      cancelOnError: cancelOnError,
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

import 'package:supabase_flutter/supabase_flutter.dart';

/// 1. User Model
class CSUser {
  final String uid;
  final String name;
  final String email;
  final String phone;
  final String role;
  final String profilePic;
  final bool verified;
  final List<String> verificationDocs;
  final int trustScore;
  final DateTime joinedDate;
  final UserPreferences preferences;
  final String username;
  final bool blocked;

  CSUser({
    required this.uid,
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
    required this.profilePic,
    required this.verified,
    required this.verificationDocs,
    required this.trustScore,
    required this.joinedDate,
    required this.preferences,
    required this.username,
    required this.blocked,
  });

  factory CSUser.fromMap(Map<String, dynamic> data, String id) {
    return CSUser(
      uid: id,
      name: data['name'] ?? '',
      email: data['email'] ?? '',
      phone: data['phone'] ?? '',
      role: data['role'] ?? 'student',
      profilePic: data['profile_pic'] ?? 'https://api.dicebear.com/7.x/adventurer/png?seed=$id',
      verified: data['verified'] ?? false,
      verificationDocs: List<String>.from(data['verification_docs'] ?? []),
      trustScore: data['trust_score'] ?? 85,
      joinedDate: DateTime.parse(data['joined_date'] ?? DateTime.now().toIso8601String()),
      preferences: UserPreferences.fromMap(data['preferences'] ?? {}),
      username: data['username'] ?? '',
      blocked: data['blocked'] ?? false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': uid,
      'name': name,
      'email': email,
      'phone': phone,
      'role': role,
      'profile_pic': profilePic,
      'verified': verified,
      'verification_docs': verificationDocs,
      'trust_score': trustScore,
      'joined_date': joinedDate.toIso8601String(),
      'preferences': preferences.toMap(),
      'username': username,
      'blocked': blocked,
    };
  }
}

class UserPreferences {
  final int budgetMin;
  final int budgetMax;
  final String sleepHabit;
  final String dietary;
  final String cleanliness;
  final String socialStatus;

  UserPreferences({
    required this.budgetMin,
    required this.budgetMax,
    required this.sleepHabit,
    required this.dietary,
    required this.cleanliness,
    required this.socialStatus,
  });

  factory UserPreferences.fromMap(Map<String, dynamic> data) {
    return UserPreferences(
      budgetMin: data['budgetMin'] ?? 2000,
      budgetMax: data['budgetMax'] ?? 15000,
      sleepHabit: data['sleepHabit'] ?? 'flexible',
      dietary: data['dietary'] ?? 'any',
      cleanliness: data['cleanliness'] ?? 'medium',
      socialStatus: data['socialStatus'] ?? 'medium',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'budgetMin': budgetMin,
      'budgetMax': budgetMax,
      'sleepHabit': sleepHabit,
      'dietary': dietary,
      'cleanliness': cleanliness,
      'socialStatus': socialStatus,
    };
  }
}

/// 2. Room Model
class Room {
  final String id;
  final String ownerId;
  final String title;
  final String description;
  final String city;
  final String detailedAddress;
  final int rent;
  final List<String> amenities;
  final List<String> images;
  final bool available;
  final bool verified;
  final double rating;
  final double? latitude;
  final double? longitude;
  final int capacity;
  final int deposit;

  Room({
    required this.id,
    required this.ownerId,
    required this.title,
    required this.description,
    required this.city,
    required this.detailedAddress,
    required this.rent,
    required this.amenities,
    required this.images,
    required this.available,
    required this.verified,
    required this.rating,
    this.latitude,
    this.longitude,
    required this.capacity,
    required this.deposit,
  });

  factory Room.fromMap(Map<String, dynamic> data, String id) {
    return Room(
      id: id,
      ownerId: data['owner_id'] ?? '',
      title: data['title'] ?? '',
      description: data['description'] ?? '',
      city: data['city'] ?? '',
      detailedAddress: data['detailed_address'] ?? '',
      rent: data['rent'] ?? 0,
      amenities: List<String>.from(data['amenities'] ?? []),
      images: List<String>.from(data['images'] ?? []),
      available: data['available'] ?? true,
      verified: data['verified'] ?? false,
      rating: (data['rating'] ?? 5.0).toDouble(),
      latitude: data['latitude'] != null ? (data['latitude'] as num).toDouble() : null,
      longitude: data['longitude'] != null ? (data['longitude'] as num).toDouble() : null,
      capacity: data['capacity'] ?? 4,
      deposit: data['deposit'] ?? 0,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'owner_id': ownerId,
      'title': title,
      'description': description,
      'city': city,
      'detailed_address': detailedAddress,
      'rent': rent,
      'amenities': amenities,
      'images': images,
      'available': available,
      'verified': verified,
      'rating': rating,
      'latitude': latitude,
      'longitude': longitude,
      'capacity': capacity,
      'deposit': deposit,
    };
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Room && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// 3. Booking Model
class Booking {
  final String id;
  final String studentId;
  final String roomId;
  final String ownerId;
  final String status;
  final DateTime moveInDate;
  final String rentalAgreementUrl;
  final int rent;

  Booking({
    required this.id,
    required this.studentId,
    required this.roomId,
    required this.ownerId,
    required this.status,
    required this.moveInDate,
    required this.rentalAgreementUrl,
    required this.rent,
  });

  factory Booking.fromMap(Map<String, dynamic> data, String id) {
    return Booking(
      id: id,
      studentId: data['student_id'] ?? '',
      roomId: data['room_id'] ?? '',
      ownerId: data['owner_id'] ?? '',
      status: data['status'] ?? 'Requested',
      moveInDate: DateTime.parse(data['move_in_date'] ?? DateTime.now().toIso8601String()),
      rentalAgreementUrl: data['rental_agreement_url'] ?? '',
      rent: data['rent'] ?? 5000,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'student_id': studentId,
      'room_id': roomId,
      'owner_id': ownerId,
      'status': status,
      'move_in_date': moveInDate.toIso8601String(),
      'rental_agreement_url': rentalAgreementUrl,
      'rent': rent,
    };
  }
}

/// 4. Maintenance Ticket Model
class MaintenanceTicket {
  final String id;
  final String roomId;
  final String ownerId;
  final String studentId;
  final String status;
  final String issue;
  final String roomAddress;
  final List<String> photos;
  final DateTime createdAt;
  final DateTime? resolvedAt;
  final String? resolutionNotes;

  MaintenanceTicket({
    required this.id,
    required this.roomId,
    required this.ownerId,
    required this.studentId,
    required this.status,
    required this.issue,
    required this.roomAddress,
    required this.photos,
    required this.createdAt,
    this.resolvedAt,
    this.resolutionNotes,
  });

  factory MaintenanceTicket.fromMap(Map<String, dynamic> data, String id) {
    return MaintenanceTicket(
      id: id,
      roomId: data['room_id'] ?? '',
      ownerId: data['owner_id'] ?? '',
      studentId: data['student_id'] ?? '',
      status: data['status'] ?? 'Open',
      issue: data['issue'] ?? '',
      roomAddress: data['room_address'] ?? 'Accommodation',
      photos: List<String>.from(data['photos'] ?? []),
      createdAt: DateTime.parse(data['created_at'] ?? DateTime.now().toIso8601String()),
      resolvedAt: data['resolved_at'] != null ? DateTime.parse(data['resolved_at']) : null,
      resolutionNotes: data['resolution_notes'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'room_id': roomId,
      'owner_id': ownerId,
      'student_id': studentId,
      'status': status,
      'issue': issue,
      'room_address': roomAddress,
      'photos': photos,
      'created_at': createdAt.toIso8601String(),
      'resolved_at': resolvedAt?.toIso8601String(),
      'resolution_notes': resolutionNotes,
    };
  }
}

/// 5. Real-time Message Model
class ChatMessage {
  final String id;
  final String senderId;
  final String senderName;
  final String text;
  final DateTime createdAt;
  final String? imageUrl;
  final bool isRead;

  ChatMessage({
    required this.id,
    required this.senderId,
    required this.senderName,
    required this.text,
    required this.createdAt,
    this.imageUrl,
    this.isRead = false,
  });

  factory ChatMessage.fromMap(Map<String, dynamic> data, String id) {
    return ChatMessage(
      id: id,
      senderId: data['sender_id'] ?? '',
      senderName: data['sender_name'] ?? 'User',
      text: data['text'] ?? '',
      createdAt: DateTime.parse(data['created_at'] ?? DateTime.now().toIso8601String()),
      imageUrl: data['image_url'],
      isRead: data['is_read'] ?? false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'sender_id': senderId,
      'sender_name': senderName,
      'text': text,
      'created_at': createdAt.toIso8601String(),
      if (imageUrl != null) 'image_url': imageUrl,
      'is_read': isRead,
    };
  }
}

/// 6. Room Bill Model (Owner entered bills)
class RoomBill {
  final String id;
  final String roomId;
  final int electricityBill;
  final int maidBill;
  final int wifiBill;
  final String billingMonth;
  final DateTime createdAt;

  RoomBill({
    required this.id,
    required this.roomId,
    required this.electricityBill,
    required this.maidBill,
    required this.wifiBill,
    required this.billingMonth,
    required this.createdAt,
  });

  factory RoomBill.fromMap(Map<String, dynamic> data, String id) {
    return RoomBill(
      id: id,
      roomId: data['room_id'] ?? '',
      electricityBill: data['electricity_bill'] ?? 0,
      maidBill: data['maid_bill'] ?? 0,
      wifiBill: data['wifi_bill'] ?? 0,
      billingMonth: data['billing_month'] ?? '',
      createdAt: DateTime.parse(data['created_at'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'room_id': roomId,
      'electricity_bill': electricityBill,
      'maid_bill': maidBill,
      'wifi_bill': wifiBill,
      'billing_month': billingMonth,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

/// 7. Owner Payout / Withdrawal Model
class Payout {
  final String id;
  final String ownerId;
  final int amount;
  final String payoutMethod;
  final String accountDetails;
  final String status;
  final String referenceId;
  final DateTime createdAt;

  Payout({
    required this.id,
    required this.ownerId,
    required this.amount,
    required this.payoutMethod,
    required this.accountDetails,
    required this.status,
    required this.referenceId,
    required this.createdAt,
  });

  factory Payout.fromMap(Map<String, dynamic> data, String id) {
    return Payout(
      id: id,
      ownerId: data['owner_id'] ?? '',
      amount: data['amount'] ?? 0,
      payoutMethod: data['payout_method'] ?? 'UPI',
      accountDetails: data['account_details'] ?? '',
      status: data['status'] ?? 'Processing',
      referenceId: data['reference_id'] ?? '',
      createdAt: DateTime.parse(data['created_at'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'owner_id': ownerId,
      'amount': amount,
      'payout_method': payoutMethod,
      'account_details': accountDetails,
      'status': status,
      'reference_id': referenceId,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

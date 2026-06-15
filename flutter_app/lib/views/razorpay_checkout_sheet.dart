import 'dart:async';
import 'package:flutter/material.dart';
import '../services/services.dart';

enum CheckoutState {
  methods,
  cardInput,
  cardOtp,
  upiApps,
  upiPin,
  netbanking,
  processing,
  success,
}

class RazorpayCheckoutSheet extends StatefulWidget {
  final int amount;
  final String bookingId;
  final String studentId;
  final PaymentService paymentService;
  final Function(String transactionId) onPaymentSuccess;

  const RazorpayCheckoutSheet({
    super.key,
    required this.amount,
    required this.bookingId,
    required this.studentId,
    required this.paymentService,
    required this.onPaymentSuccess,
  });

  @override
  State<RazorpayCheckoutSheet> createState() => _RazorpayCheckoutSheetState();
}

class _RazorpayCheckoutSheetState extends State<RazorpayCheckoutSheet> {
  CheckoutState _currentState = CheckoutState.methods;
  String _selectedMethod = 'UPI';
  String _selectedUpiApp = 'Google Pay';
  String _selectedBank = 'HDFC Bank';
  
  // Card Inputs
  final _cardNumberController = TextEditingController();
  final _cardExpiryController = TextEditingController();
  final _cardCvvController = TextEditingController();
  final _cardNameController = TextEditingController();

  // OTP Input
  final _otpController = TextEditingController();

  // UPI PIN input
  String _upiPin = '';

  // Processing indicators
  String _processingMessage = 'Securing connection...';
  late String _transactionId;

  @override
  void initState() {
    super.initState();
    _transactionId = 'pay_${DateTime.now().millisecondsSinceEpoch}';
  }

  @override
  void dispose() {
    _cardNumberController.dispose();
    _cardExpiryController.dispose();
    _cardCvvController.dispose();
    _cardNameController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  void _changeState(CheckoutState newState, {int delayMs = 0, String? message}) {
    if (message != null) {
      setState(() {
        _processingMessage = message;
      });
    }
    if (delayMs > 0) {
      setState(() {
        _currentState = CheckoutState.processing;
      });
      Timer(Duration(milliseconds: delayMs), () {
        if (mounted) {
          setState(() {
            _currentState = newState;
          });
        }
      });
    } else {
      setState(() {
        _currentState = newState;
      });
    }
  }

  void _processAndSavePayment(String method) async {
    _changeState(
      CheckoutState.processing,
      message: 'Authorizing ₹${widget.amount} via Razorpay Gateway...',
    );

    // Write to Supabase database
    final success = await widget.paymentService.createRazorpayPayment(
      bookingId: widget.bookingId,
      amount: widget.amount,
      studentId: widget.studentId,
      method: method,
      status: 'Successful',
      razorpayId: _transactionId,
    );

    if (success) {
      _changeState(CheckoutState.success, delayMs: 1000);
      Timer(const Duration(milliseconds: 2500), () {
        if (mounted) {
          Navigator.pop(context); // Close bottom sheet
          widget.onPaymentSuccess(_transactionId);
        }
      });
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment server registration failed. Please retry.')),
        );
        Navigator.pop(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0B1E36),
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Razorpay Header Bar
            _buildHeader(),
            
            // Content according to current checkout stage
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              child: _buildStageContent(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: const BoxDecoration(
        color: Color(0xFF0F2647),
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.blue.shade800,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Icon(Icons.bolt, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Razorpay Secure',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  Text(
                    'CampusStay Housing Solutions',
                    style: TextStyle(color: Colors.grey.shade400, fontSize: 11),
                  ),
                ],
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '₹${widget.amount}',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
              ),
              Row(
                children: [
                  Icon(Icons.shield, size: 10, color: Colors.greenAccent.shade400),
                  const SizedBox(width: 2),
                  Text(
                    '100% SECURE',
                    style: TextStyle(color: Colors.greenAccent.shade400, fontSize: 8, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStageContent() {
    switch (_currentState) {
      case CheckoutState.methods:
        return _buildMethodsView();
      case CheckoutState.cardInput:
        return _buildCardInputView();
      case CheckoutState.cardOtp:
        return _buildCardOtpView();
      case CheckoutState.upiApps:
        return _buildUpiAppsView();
      case CheckoutState.upiPin:
        return _buildUpiPinView();
      case CheckoutState.netbanking:
        return _buildNetbankingView();
      case CheckoutState.processing:
        return _buildProcessingView();
      case CheckoutState.success:
        return _buildSuccessView();
    }
  }

  Widget _buildMethodsView() {
    return Column(
      key: const ValueKey('methods'),
      children: [
        const Padding(
          padding: EdgeInsets.only(top: 20, left: 20, right: 20),
          child: Row(
            children: [
              Text(
                'PREFERRED PAYMENT OPTIONS',
                style: TextStyle(color: Colors.grey, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.0),
              ),
            ],
          ),
        ),
        _buildMethodItem(
          icon: Icons.qr_code_scanner_rounded,
          title: 'UPI (GPay, PhonePe, Paytm)',
          subtitle: 'Pay instantly using mobile apps',
          onTap: () {
            _selectedMethod = 'UPI';
            _changeState(CheckoutState.upiApps);
          },
        ),
        _buildMethodItem(
          icon: Icons.credit_card_rounded,
          title: 'Credit / Debit Card',
          subtitle: 'Visa, MasterCard, RuPay, Maestro',
          onTap: () {
            _selectedMethod = 'Card';
            _changeState(CheckoutState.cardInput);
          },
        ),
        _buildMethodItem(
          icon: Icons.account_balance_rounded,
          title: 'Netbanking',
          subtitle: 'All major Indian banks supported',
          onTap: () {
            _selectedMethod = 'NetBanking';
            _changeState(CheckoutState.netbanking);
          },
        ),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.lock_outline, size: 12, color: Colors.grey),
              SizedBox(width: 4),
              Text(
                'Secured by 256-bit SSL encryption',
                style: TextStyle(color: Colors.grey, fontSize: 11),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMethodItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: Color(0xFF152E52))),
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.blue.shade400, size: 24),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Colors.grey, size: 18),
          ],
        ),
      ),
    );
  }

  Widget _buildCardInputView() {
    return Padding(
      key: const ValueKey('cardInput'),
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                onPressed: () => _changeState(CheckoutState.methods),
              ),
              const Text(
                'ENTER CARD DETAILS',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildTextField(
            controller: _cardNumberController,
            label: 'Card Number',
            hint: '4321 8765 9000 1234',
            keyboard: TextInputType.number,
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildTextField(
                  controller: _cardExpiryController,
                  label: 'Expiry',
                  hint: 'MM/YY',
                  keyboard: TextInputType.number,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildTextField(
                  controller: _cardCvvController,
                  label: 'CVV',
                  hint: '123',
                  keyboard: TextInputType.number,
                  obscure: true,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildTextField(
            controller: _cardNameController,
            label: 'Cardholder Name',
            hint: 'Rohan Sharma',
            keyboard: TextInputType.name,
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: () {
                if (_cardNumberController.text.isEmpty || _cardCvvController.text.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please fill out card details.')),
                  );
                  return;
                }
                _changeState(CheckoutState.cardOtp, delayMs: 1200, message: 'Initiating bank secure checkout...');
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue.shade700,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: Text(
                'Pay ₹${widget.amount}',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCardOtpView() {
    return Padding(
      key: const ValueKey('cardOtp'),
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'BANK OTP VERIFICATION',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
          ),
          const SizedBox(height: 8),
          const Text(
            'Enter the 6-digit OTP sent to your registered phone number (xxxxxx-4930) to complete this transaction.',
            style: TextStyle(color: Colors.grey, fontSize: 12),
          ),
          const SizedBox(height: 20),
          _buildTextField(
            controller: _otpController,
            label: 'OTP Code',
            hint: '123456',
            keyboard: TextInputType.number,
            obscure: false,
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: () {
                if (_otpController.text.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please type the OTP to confirm.')),
                  );
                  return;
                }
                _processAndSavePayment('Card');
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green.shade700,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text(
                'Verify & Secure Rent Payment',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUpiAppsView() {
    final upiApps = [
      {'name': 'Google Pay', 'icon': Icons.account_balance_wallet},
      {'name': 'PhonePe', 'icon': Icons.payment},
      {'name': 'Paytm UPI', 'icon': Icons.qr_code},
      {'name': 'BHIM UPI', 'icon': Icons.mobile_friendly},
    ];

    return Padding(
      key: const ValueKey('upiApps'),
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                onPressed: () => _changeState(CheckoutState.methods),
              ),
              const Text(
                'SELECT UPI APPLICATION',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ],
          ),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 2.2,
            ),
            itemCount: upiApps.length,
            itemBuilder: (context, idx) {
              final app = upiApps[idx];
              return InkWell(
                onTap: () {
                  _selectedUpiApp = app['name'] as String;
                  _changeState(
                    CheckoutState.upiPin,
                    delayMs: 1500,
                    message: 'Opening $_selectedUpiApp App...',
                  );
                },
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF152E52),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.blue.withOpacity(0.2)),
                  ),
                  padding: const EdgeInsets.all(8),
                  child: Row(
                    children: [
                      Icon(app['icon'] as IconData, color: Colors.blue.shade400, size: 24),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          app['name'] as String,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildUpiPinView() {
    return Container(
      key: const ValueKey('upiPin'),
      color: Colors.black,
      padding: const EdgeInsets.all(24.0),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'CampusStay Rent Portal via $_selectedUpiApp',
                style: const TextStyle(color: Colors.white70, fontSize: 12),
              ),
              const Icon(Icons.security, color: Colors.white70, size: 16),
            ],
          ),
          const SizedBox(height: 20),
          const Text(
            'ENTER 4-DIGIT UPI PIN',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15, letterSpacing: 1.0),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(4, (index) {
              final filled = index < _upiPin.length;
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 12),
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: filled ? Colors.white : Colors.transparent,
                  border: Border.all(color: Colors.white30, width: 2),
                ),
              );
            }),
          ),
          const SizedBox(height: 24),
          // PIN keyboard
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              childAspectRatio: 1.8,
            ),
            itemCount: 12,
            itemBuilder: (context, idx) {
              if (idx == 9) {
                return IconButton(
                  icon: const Icon(Icons.backspace, color: Colors.white),
                  onPressed: () {
                    if (_upiPin.isNotEmpty) {
                      setState(() {
                        _upiPin = _upiPin.substring(0, _upiPin.length - 1);
                      });
                    }
                  },
                );
              }
              if (idx == 11) {
                return IconButton(
                  icon: const Icon(Icons.check_circle, color: Colors.greenAccent, size: 36),
                  onPressed: () {
                    if (_upiPin.length < 4) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('UPI PIN must be 4 digits.')),
                      );
                      return;
                    }
                    _processAndSavePayment('UPI');
                  },
                );
              }
              final digit = idx == 10 ? 0 : idx + 1;
              return InkWell(
                onTap: () {
                  if (_upiPin.length < 4) {
                    setState(() {
                      _upiPin += digit.toString();
                    });
                  }
                },
                child: Center(
                  child: Text(
                    digit.toString(),
                    style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildNetbankingView() {
    final banks = ['SBI Bank', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Bank'];
    return Padding(
      key: const ValueKey('netbanking'),
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                onPressed: () => _changeState(CheckoutState.methods),
              ),
              const Text(
                'NETBANKING PORTAL',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: banks.length,
            itemBuilder: (context, idx) {
              final bank = banks[idx];
              return InkWell(
                onTap: () {
                  _selectedBank = bank;
                  _processAndSavePayment('NetBanking');
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
                  decoration: const BoxDecoration(
                    border: Border(bottom: BorderSide(color: Color(0xFF152E52))),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.account_balance, color: Colors.amber, size: 20),
                      const SizedBox(width: 14),
                      Text(
                        bank,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                      ),
                      const Spacer(),
                      const Icon(Icons.chevron_right, color: Colors.grey, size: 14),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildProcessingView() {
    return Padding(
      key: const ValueKey('processing'),
      padding: const EdgeInsets.symmetric(vertical: 40.0, horizontal: 20),
      child: Center(
        child: Column(
          children: [
            const CircularProgressIndicator(color: Colors.blue),
            const SizedBox(height: 20),
            Text(
              _processingMessage,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuccessView() {
    return Padding(
      key: const ValueKey('success'),
      padding: const EdgeInsets.symmetric(vertical: 40.0, horizontal: 20),
      child: Center(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: const BoxDecoration(
                color: Colors.green,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check, color: Colors.white, size: 40),
            ),
            const SizedBox(height: 20),
            const Text(
              'PAYMENT SUCCESSFUL!',
              style: TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 8),
            Text(
              'Transaction ID: $_transactionId',
              style: TextStyle(color: Colors.grey.shade400, fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required TextInputType keyboard,
    bool obscure = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(color: Colors.grey, fontSize: 10, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: keyboard,
          obscureText: obscure,
          style: const TextStyle(color: Colors.white, fontSize: 14),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: Colors.white30, fontSize: 14),
            fillColor: const Color(0xFF152E52),
            filled: true,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(6),
              borderSide: BorderSide.none,
            ),
          ),
        ),
      ],
    );
  }
}

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shimmer/shimmer.dart';
import 'main.dart';
import 'services/api_service.dart';
import 'widgets/filter_screen.dart';
import 'widgets/outlet_picker.dart';
import 'day_end_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _currentIndex = 0;
  Map<String, dynamic>? _user;
  bool _isAdmin = false;

  List<dynamic> _outlets = [];

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString('user');
    if (userStr != null) {
      if (mounted) {
        setState(() {
          _user = jsonDecode(userStr);
          _isAdmin = _user?['is_admin'] == 1 || _user?['is_admin'] == true;
        });
        if (_isAdmin) {
          _loadOutlets();
        }
      }
    }
  }

  Future<void> _loadOutlets() async {
    try {
      final ApiService apiService = ApiService();
      final outlets = await apiService.getOutlets();
      if (mounted) {
        setState(() {
          _outlets = outlets;
        });
      }
    } catch (e) {
      debugPrint('Error loading outlets in home: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(
          _currentIndex == 0 ? 'Orders' : _currentIndex == 1 ? 'Day End' : 'Settings',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 24, letterSpacing: -0.5),
        ),
        centerTitle: false,
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(color: Colors.black12, height: 1.0),
        ),
      ),
      body: _currentIndex == 0 ? _HomeContent(user: _user, isAdmin: _isAdmin, outlets: _outlets) :
            _currentIndex == 1 ? DayEndPage(user: _user, isAdmin: _isAdmin, outlets: _outlets) :
            const _SettingsContent(),
      // SafeArea ensures the bottom nav is not hidden under the iOS home
      // indicator / virtual home bar in standalone (PWA) mode.
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          decoration: const BoxDecoration(
            border: Border(top: BorderSide(color: Colors.black12, width: 1.0)),
          ),
          child: BottomNavigationBar(
            backgroundColor: Colors.white,
            selectedItemColor: Colors.black,
            unselectedItemColor: Colors.black45,
            elevation: 0,
            currentIndex: _currentIndex,
            onTap: (index) {
              setState(() {
                _currentIndex = index;
              });
            },
            items: const [
              BottomNavigationBarItem(
                icon: Icon(Icons.receipt_long),
                label: 'Orders',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.bar_chart),
                label: 'Day End',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.settings),
                label: 'Settings',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeContent extends StatefulWidget {
  final Map<String, dynamic>? user;
  final bool isAdmin;
  final List<dynamic> outlets;

  const _HomeContent({required this.user, required this.isAdmin, required this.outlets});

  @override
  State<_HomeContent> createState() => _HomeContentState();
}

class _HomeContentState extends State<_HomeContent> {
  final ApiService _apiService = ApiService();
  int? _selectedOutletId;
  List<dynamic> _orders = [];
  bool _isLoading = false;

  // Filters
  String _paymentMethod = 'all';
  String _status = 'all';
  String _orderType = 'all';
  DateTime? _startDate;
  DateTime? _endDate;

  double _totalAmount = 0.0;
  int _totalOrdersCount = 0;

  @override
  void initState() {
    super.initState();
    if (widget.user != null) {
      _initData();
    }
  }

  @override
  void didUpdateWidget(_HomeContent oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.user != null && oldWidget.user == null) {
      _initData();
    }
    // When parent's outlets arrive for the first time, kick off orders load
    if (widget.isAdmin &&
        widget.outlets.isNotEmpty &&
        oldWidget.outlets.isEmpty &&
        _selectedOutletId == null) {
      setState(() {
        _selectedOutletId = widget.outlets.first['id'] is int
            ? widget.outlets.first['id']
            : int.tryParse(widget.outlets.first['id'].toString());
      });
      _loadOrders();
    }
  }

  Future<void> _initData() async {
    if (widget.isAdmin) {
      if (widget.outlets.isNotEmpty) {
        setState(() {
          _selectedOutletId = widget.outlets.first['id'] is int
              ? widget.outlets.first['id']
              : int.tryParse(widget.outlets.first['id'].toString());
        });
        await _loadOrders();
      }
      // else: outlets not loaded yet — didUpdateWidget will trigger when they arrive
    } else {
      _selectedOutletId = widget.user?['customer_id'];
      await _loadOrders();
    }
  }

  Future<void> _loadOrders() async {
    if (_selectedOutletId == null) return;

    if (mounted) {
      setState(() {
        _isLoading = true;
      });
    }

    try {
      Map<String, dynamic> resp;
      
      String? startStr = _startDate != null ? "${_startDate!.year}-${_startDate!.month.toString().padLeft(2, '0')}-${_startDate!.day.toString().padLeft(2, '0')}" : null;
      String? endStr = _endDate != null ? "${_endDate!.year}-${_endDate!.month.toString().padLeft(2, '0')}-${_endDate!.day.toString().padLeft(2, '0')}" : null;

      if (widget.isAdmin) {
        resp = await _apiService.getOrdersByOutlet(
          _selectedOutletId!,
          paymentMethod: _paymentMethod,
          status: _status,
          orderType: _orderType,
          startDate: startStr,
          endDate: endStr,
        );
      } else {
        resp = await _apiService.getOrders(
          _selectedOutletId!,
          paymentMethod: _paymentMethod,
          status: _status,
          orderType: _orderType,
          startDate: startStr,
          endDate: endStr,
        );
      }
      
      if (mounted) {
        setState(() {
          _orders = resp['data'] ?? [];
          if (resp['aggregates'] != null) {
            _totalAmount = double.tryParse(resp['aggregates']['total_amount']?.toString() ?? '0') ?? 0.0;
            _totalOrdersCount = int.tryParse(resp['aggregates']['total_orders']?.toString() ?? '0') ?? _orders.length;
          } else {
            _totalOrdersCount = _orders.length;
            _totalAmount = _orders.fold(0.0, (sum, item) {
              final amount = double.tryParse(item['final_total']?.toString() ?? '0') ?? 0.0;
              return sum + amount;
            });
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading orders: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _orders = [];
        });
      }
    }
  }

  void _showFilterModal() async {
    final result = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (context) => FilterScreen(
          initialPaymentMethod: _paymentMethod,
          initialStatus: _status,
          initialOrderType: _orderType,
          initialStartDate: _startDate,
          initialEndDate: _endDate,
        ),
      ),
    );

    if (result != null && mounted) {
      setState(() {
        _paymentMethod = result['paymentMethod'];
        _status = result['status'];
        _orderType = result['orderType'];
        _startDate = result['startDate'];
        _endDate = result['endDate'];
      });
      _loadOrders();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Top section with Outlet Selector and Filter Button
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Row(
            children: [
              if (widget.isAdmin)
                Expanded(
                  child: OutletPickerField(
                    outlets: widget.outlets,
                    selectedOutletId: _selectedOutletId,
                    onChanged: (val) {
                      setState(() {
                        _selectedOutletId = val;
                      });
                      if (val != null) {
                        _loadOrders();
                      }
                    },
                  ),
                )
              else
                const Expanded(
                  child: Text(
                    'My Orders',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.black, letterSpacing: -0.5),
                  ),
                ),
              const SizedBox(width: 16),
              Container(
                decoration: BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: IconButton(
                  onPressed: _showFilterModal,
                  icon: const Icon(Icons.filter_list, color: Colors.white),
                  tooltip: 'Filter Options',
                ),
              )
            ],
          ),
        ),
        const Divider(height: 1, color: Colors.black12),
        // Summary Section
        if (!_isLoading && _orders.isNotEmpty)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            color: Colors.white,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total Orders', style: TextStyle(color: Colors.black54, fontSize: 13)),
                    const SizedBox(height: 4),
                    Text('$_totalOrdersCount', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: Colors.black)),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text('Total Amount', style: TextStyle(color: Colors.black54, fontSize: 13)),
                    const SizedBox(height: 4),
                    Text(
                      '₹${_totalAmount.toStringAsFixed(2)}',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: Colors.black),
                    ),
                  ],
                ),
              ],
            ),
          ),
        if (!_isLoading && _orders.isNotEmpty)
          const Divider(height: 1, color: Colors.black12),
        // Orders List Section
        Expanded(
          child: _isLoading
              ? const _OrderListSkeleton()
              : _orders.isEmpty
                  ? const Center(child: Text('No orders found.'))
                  : ListView.builder(
                      itemCount: _orders.length,
                      itemBuilder: (context, index) {
                        final order = _orders[index];
                        final rawCusName = order['customer_name']?.toString();
                        final billNo = order['bill_no']?.toString() ?? 'N/A';
                        final customerName = (rawCusName != null && rawCusName.isNotEmpty)
                             ? rawCusName
                             : 'Bill #$billNo';
                        final amount = order['final_total'] ?? '0.00';
                        final payment = order['payment_method'] ?? 'cash';
                        final type = order['order_type'] ?? 'takeaway';
                        final ordStatus = order['status'] ?? 'pending';
                        final orderDateStr = order['order_datetime'];
                        String formattedDate = '';
                        if (orderDateStr != null && orderDateStr.toString().isNotEmpty) {
                          try {
                            final dt = DateTime.parse(orderDateStr.toString());
                            formattedDate = "\n${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}";
                          } catch (_) {}
                        }

                        return Container(
                          margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.black12, width: 1.5),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(20),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            customerName,
                                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Colors.black, letterSpacing: -0.3),
                                          ),
                                          if (formattedDate.isNotEmpty)
                                            Padding(
                                              padding: const EdgeInsets.only(top: 4.0),
                                              child: Text(
                                                formattedDate.trim(),
                                                style: const TextStyle(color: Colors.black54, fontSize: 13, fontWeight: FontWeight.w500),
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                    Text(
                                      '₹$amount',
                                      style: const TextStyle(color: Colors.black, fontWeight: FontWeight.w900, fontSize: 20),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                const Divider(height: 1, color: Colors.black12),
                                const SizedBox(height: 16),
                                Wrap(
                                  spacing: 12,
                                  runSpacing: 8,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      decoration: BoxDecoration(
                                        border: Border.all(color: Colors.black26),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        type.toString().toUpperCase(),
                                        style: const TextStyle(fontSize: 11, color: Colors.black87, fontWeight: FontWeight.w700, letterSpacing: 0.5),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: Colors.black,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        payment.toString().toUpperCase(),
                                        style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.w700, letterSpacing: 0.5),
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.circle, size: 8, color: _getStatusColor(ordStatus)),
                                        const SizedBox(width: 6),
                                        Text(
                                          ordStatus.toUpperCase(),
                                          style: const TextStyle(
                                            color: Colors.black87,
                                            fontWeight: FontWeight.w800,
                                            fontSize: 12,
                                            letterSpacing: 0.5,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
        ),
      ],
    );
  }

  Color _getStatusColor(String stat) {
    switch (stat.toLowerCase()) {
      case 'completed':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'preparing':
        return Colors.blue;
      case 'ready':
        return Colors.teal;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}

class _OrderListSkeleton extends StatelessWidget {
  const _OrderListSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: 6,
      itemBuilder: (context, index) {
        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Shimmer.fromColors(
              baseColor: Colors.grey.shade300,
              highlightColor: Colors.grey.shade100,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(height: 16, width: 120, color: Colors.white),
                      Container(height: 16, width: 60, color: Colors.white),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Container(height: 14, width: 180, color: Colors.white),
                  const SizedBox(height: 8),
                  Container(height: 14, width: 80, color: Colors.white),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class CircularProgressPadding extends StatelessWidget {
  const CircularProgressPadding({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.all(20.0),
      child: CircularProgressIndicator(),
    );
  }
}

class _SettingsContent extends StatelessWidget {
  const _SettingsContent();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.settings_outlined, size: 64, color: Colors.black87),
          const SizedBox(height: 16),
          const Text('Account Settings', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
          const SizedBox(height: 32),
          OutlinedButton.icon(
            onPressed: () async {
              // Logout action
              final prefs = await SharedPreferences.getInstance();
              final keepMeLoggedIn = prefs.getBool('keepMeLoggedIn') ?? false;
              if (!keepMeLoggedIn) {
                await prefs.remove('email');
                await prefs.remove('password');
              }
              await prefs.remove('accessToken');
              await prefs.remove('user');

              if (context.mounted) {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (context) => const LoginPage()),
                );
              }
            },
            icon: const Icon(Icons.logout),
            label: const Text('LOG OUT', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1)),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              side: const BorderSide(color: Colors.black87, width: 2),
              foregroundColor: Colors.black, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }
}

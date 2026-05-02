import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shimmer/shimmer.dart';
import 'main.dart'; // To access LoginPage if needed or just use PushReplacement
import 'services/api_service.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _currentIndex = 0;
  Map<String, dynamic>? _user;
  bool _isAdmin = false;

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
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_currentIndex == 0 ? 'Orders' : 'Settings'),
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
      ),
      body: _currentIndex == 0 ? _HomeContent(user: _user, isAdmin: _isAdmin) : const _SettingsContent(),
      bottomNavigationBar: BottomNavigationBar(
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
            icon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}

class _HomeContent extends StatefulWidget {
  final Map<String, dynamic>? user;
  final bool isAdmin;

  const _HomeContent({required this.user, required this.isAdmin});

  @override
  State<_HomeContent> createState() => _HomeContentState();
}

class _HomeContentState extends State<_HomeContent> {
  final ApiService _apiService = ApiService();
  List<dynamic> _outlets = [];
  int? _selectedOutletId;
  List<dynamic> _orders = [];
  bool _isLoading = false;

  // Filters
  String _paymentMethod = 'all';
  String _status = 'all';
  String _orderType = 'all';

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
  }

  Future<void> _initData() async {
    if (widget.isAdmin) {
      await _loadOutlets();
    } else {
      _selectedOutletId = widget.user?['customer_id'];
      await _loadOrders();
    }
  }

  Future<void> _loadOutlets() async {
    try {
      final outlets = await _apiService.getOutlets();
      if (mounted) {
        setState(() {
          _outlets = outlets;
          if (_outlets.isNotEmpty) {
            _selectedOutletId = _outlets.first['id'];
          }
        });
        if (_selectedOutletId != null) {
          _loadOrders();
        }
      }
    } catch (e) {
      debugPrint('Error loading outlets: $e');
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
      if (widget.isAdmin) {
        resp = await _apiService.getOrdersByOutlet(
          _selectedOutletId!,
          paymentMethod: _paymentMethod,
          status: _status,
          orderType: _orderType,
        );
        if (mounted) {
          setState(() {
            _orders = resp['data'] ?? [];
            _isLoading = false;
          });
        }
      } else {
        resp = await _apiService.getOrders(
          _selectedOutletId!,
          paymentMethod: _paymentMethod,
          status: _status,
          orderType: _orderType,
        );
        if (mounted) {
          setState(() {
            _orders = resp['data'] ?? [];
            _isLoading = false;
          });
        }
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

  void _showFilterModal() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Filters', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: _paymentMethod,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Payment Method'),
                    items: const [
                      DropdownMenuItem(value: 'all', child: Text('All')),
                      DropdownMenuItem(value: 'cash', child: Text('Cash')),
                      DropdownMenuItem(value: 'card', child: Text('Card')),
                      DropdownMenuItem(value: 'swigy', child: Text('Swiggy')),
                      DropdownMenuItem(value: 'zomato', child: Text('Zomato')),
                      DropdownMenuItem(value: 'online', child: Text('Online')),
                    ],
                    onChanged: (v) => setModalState(() => _paymentMethod = v!),
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    value: _status,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Status'),
                    items: const [
                      DropdownMenuItem(value: 'all', child: Text('All')),
                      DropdownMenuItem(value: 'pending', child: Text('Pending')),
                      DropdownMenuItem(value: 'preparing', child: Text('Preparing')),
                      DropdownMenuItem(value: 'ready', child: Text('Ready')),
                      DropdownMenuItem(value: 'completed', child: Text('Completed')),
                      DropdownMenuItem(value: 'cancelled', child: Text('Cancelled')),
                    ],
                    onChanged: (v) => setModalState(() => _status = v!),
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    value: _orderType,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Order Type'),
                    items: const [
                      DropdownMenuItem(value: 'all', child: Text('All')),
                      DropdownMenuItem(value: 'dine_in', child: Text('Dine In')),
                      DropdownMenuItem(value: 'takeaway', child: Text('Takeaway')),
                      DropdownMenuItem(value: 'delivery', child: Text('Delivery')),
                    ],
                    onChanged: (v) => setModalState(() => _orderType = v!),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () {
                        Navigator.pop(context);
                        _loadOrders();
                      },
                      child: const Text('Apply Filters'),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Top section with Outlet Selector and Filter Button
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              if (widget.isAdmin)
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<int>(
                      isExpanded: true,
                      value: _selectedOutletId,
                      hint: const Text('Select Outlet'),
                      items: _outlets.where((o) => o['id'] != null).map<DropdownMenuItem<int>>((outlet) {
                        return DropdownMenuItem<int>(
                          value: outlet['id'] is int ? outlet['id'] : int.tryParse(outlet['id'].toString()),
                          child: Text(outlet['name'] ?? 'Unknown Outlet'),
                        );
                      }).toList(),
                      onChanged: (val) {
                        setState(() {
                          _selectedOutletId = val;
                        });
                        if (val != null) {
                          _loadOrders();
                        }
                      },
                    ),
                  ),
                )
              else
                Expanded(
                  child: Text(
                    'My Orders',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.indigo.shade900),
                  ),
                ),
              const SizedBox(width: 10),
              IconButton(
                onPressed: _showFilterModal,
                icon: const Icon(Icons.filter_list),
                tooltip: 'Filter Options',
              )
            ],
          ),
        ),
        const Divider(height: 1),
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

                        return Card(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          elevation: 2,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          child: ListTile(
                            contentPadding: const EdgeInsets.all(16),
                            title: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    customerName,
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                ),
                                Text(
                                  '₹$amount',
                                  style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const SizedBox(height: 8),
                                Text('Type: $type | Payment: $payment'),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Icon(Icons.circle, size: 10, color: _getStatusColor(ordStatus)),
                                    const SizedBox(width: 4),
                                    Text(
                                      ordStatus.toUpperCase(),
                                      style: TextStyle(
                                        color: _getStatusColor(ordStatus),
                                        fontWeight: FontWeight.bold,
                                      ),
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
          const Icon(Icons.settings, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          const Text('Settings', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 32),
          ElevatedButton.icon(
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
            label: const Text('Logout'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              backgroundColor: Colors.red.shade50,
              foregroundColor: Colors.red,
            ),
          ),
        ],
      ),
    );
  }
}

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shimmer/shimmer.dart';
import 'main.dart';
import 'services/api_service.dart';
import 'widgets/filter_screen.dart';
import 'widgets/outlet_picker.dart';
import 'day_end_page.dart';
import 'expenses_page.dart';

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
          _currentIndex == 0
              ? 'Orders'
              : _currentIndex == 1
                  ? 'Expenses'
                  : _currentIndex == 2
                      ? 'Day End'
                      : 'Settings',
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
            _currentIndex == 1 ? ExpensesPage(user: _user, isAdmin: _isAdmin, outlets: _outlets) :
            _currentIndex == 2 ? DayEndPage(user: _user, isAdmin: _isAdmin, outlets: _outlets) :
            _SettingsContent(user: _user, isAdmin: _isAdmin, outlets: _outlets),
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
            type: BottomNavigationBarType.fixed,
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
                icon: Icon(Icons.account_balance_wallet_outlined),
                activeIcon: Icon(Icons.account_balance_wallet),
                label: 'Expenses',
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
  DateTime? _startDate = DateTime.now();
  DateTime? _endDate = DateTime.now();

  double _totalAmount = 0.0;
  int _totalOrdersCount = 0;

  final ScrollController _scrollController = ScrollController();
  int _visibleCount = 50;

  String? _activeDayUniqueId;
  DateTime? _activeDayStartTime;
  bool _hasActiveDay = false;

  Future<void> _refreshActiveDaySession() async {
    if (_selectedOutletId == null) return;
    try {
      final activeDayData = await _apiService.getCurrentActiveDay(_selectedOutletId!);
      if (activeDayData != null && activeDayData['success'] == true && activeDayData['unique_id'] != null) {
        _hasActiveDay = true;
        _activeDayUniqueId = activeDayData['unique_id'].toString();
      } else {
        _hasActiveDay = false;
        _activeDayUniqueId = null;
      }
    } catch (_) {
      _hasActiveDay = false;
      _activeDayUniqueId = null;
    }

    try {
      final balanceData = await _apiService.getDailyBalanceSheet(_selectedOutletId!);
      if (balanceData['data'] is List) {
        final sheets = balanceData['data'] as List;
        if (sheets.isNotEmpty) {
          final activeSheet = sheets.firstWhere(
            (s) => s is Map && (s['status'] == 'started' || s['unique_id']?.toString() == _activeDayUniqueId),
            orElse: () => null,
          );
          if (activeSheet != null && activeSheet['day_start_time'] != null) {
            _activeDayStartTime = DateTime.tryParse(activeSheet['day_start_time'].toString());
            if (_activeDayUniqueId == null && activeSheet['unique_id'] != null) {
              _hasActiveDay = true;
              _activeDayUniqueId = activeSheet['unique_id'].toString();
            }
          }
        }
      }
    } catch (_) {}
  }

  bool _isOrderInActiveSession(Map<String, dynamic> order) {
    if (!_hasActiveDay) {
      return false;
    }

    // 1. Enforce CURRENT DATE START check:
    // Order must have been placed on or after the start of today's calendar date (00:00:00)
    final orderTimeStr = (order['order_datetime'] ?? order['created_at'] ?? order['timestamp'])?.toString();
    if (orderTimeStr == null || orderTimeStr.isEmpty) {
      return false;
    }
    final orderDate = DateTime.tryParse(orderTimeStr);
    if (orderDate == null) {
      return false;
    }

    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    if (orderDate.isBefore(todayStart)) {
      return false;
    }

    // 2. Check order's daily_balance_sheet_unique_id
    final orderCycleId = order['daily_balance_sheet_unique_id']?.toString();
    if (orderCycleId != null && orderCycleId.isNotEmpty && _activeDayUniqueId != null) {
      if (orderCycleId != _activeDayUniqueId) {
        return false;
      }
    }

    // 3. Check order datetime >= day_start_time
    if (_activeDayStartTime != null && orderDate.isBefore(_activeDayStartTime!)) {
      return false;
    }

    return true;
  }

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_scrollListener);
    if (widget.user != null) {
      _initData();
    }
  }

  void _scrollListener() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 500) {
      if (_visibleCount < _orders.length) {
        setState(() {
          _visibleCount += 50;
        });
      }
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
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
      await _refreshActiveDaySession();
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
          _visibleCount = 50; // Reset visible count when new data is loaded
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
                      controller: _scrollController,
                      itemCount: _visibleCount > _orders.length ? _orders.length : _visibleCount,
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
                        final bool inActiveSession = _isOrderInActiveSession(order);
                        final bool isSettled = ordStatus.toString().toLowerCase() == 'settled';
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
                          child: Material(
                            color: Colors.transparent,
                            borderRadius: BorderRadius.circular(16),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(16),
                              onTap: () => _showSettlementSheet(order),
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
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  crossAxisAlignment: CrossAxisAlignment.center,
                                  children: [
                                    Expanded(
                                      child: Wrap(
                                        spacing: 8,
                                        runSpacing: 6,
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
                                    ),
                                    const SizedBox(width: 8),
                                    ElevatedButton.icon(
                                      onPressed: () => _showSettlementSheet(order),
                                      icon: Icon(
                                        !inActiveSession && isSettled ? Icons.lock_outline : Icons.check_circle_outline,
                                        size: 15,
                                      ),
                                      label: Text(
                                        isSettled
                                            ? (!inActiveSession ? 'Settled (Locked)' : 'Re-Settle')
                                            : 'Settle',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                      ),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: isSettled
                                            ? (!inActiveSession ? Colors.grey.shade600 : Colors.grey.shade700)
                                            : Colors.black,
                                        foregroundColor: Colors.white,
                                        elevation: 0,
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                      },
                    ),
        ),
      ],
    );
  }

  void _showSettlementSheet(Map<String, dynamic> order) {
    final bool canEditTotal = _isOrderInActiveSession(order);
    final rawOrderId = order['id'];
    final orderId = rawOrderId is int ? rawOrderId : int.tryParse(rawOrderId.toString()) ?? 0;
    final billNo = order['bill_no']?.toString() ?? 'N/A';
    final customerName = order['customer_name']?.toString() ?? '';
    final phone = order['phone']?.toString() ?? '';
    final tableNo = order['table_no']?.toString() ?? '';
    final orderType = order['order_type']?.toString().toUpperCase() ?? 'TAKEAWAY';
    final ordStatus = order['status']?.toString() ?? 'pending';
    final orderDateStr = order['order_datetime'] ?? order['created_at'];

    String formattedDate = '';
    if (orderDateStr != null && orderDateStr.toString().isNotEmpty) {
      try {
        final dt = DateTime.parse(orderDateStr.toString());
        formattedDate = "${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}";
      } catch (_) {
        formattedDate = orderDateStr.toString();
      }
    }

    final rawItems = (order['items'] as List?) ?? (order['orderItems'] as List?) ?? [];

    final initialTotalNum = (order['final_total'] is num
        ? (order['final_total'] as num).toDouble()
        : double.tryParse(order['final_total']?.toString() ?? '0') ?? 0.0);
    final subtotalNum = (order['subtotal'] is num
        ? (order['subtotal'] as num).toDouble()
        : double.tryParse(order['subtotal']?.toString() ?? '0') ?? initialTotalNum);
    final discountNum = (order['discount'] is num
        ? (order['discount'] as num).toDouble()
        : double.tryParse(order['discount']?.toString() ?? '0') ?? 0.0);

    final totalController = TextEditingController(text: initialTotalNum.toStringAsFixed(2));

    String selectedPayment = (order['payment_method']?.toString().toLowerCase() ?? 'cash');
    final validMethods = ['cash', 'card', 'cash_card', 'swiggy', 'zomato', 'upi', 'online', 'wallet'];
    if (!validMethods.contains(selectedPayment)) {
      selectedPayment = 'cash';
    }

    final initialCash = order['cash_amount'] != null
        ? (order['cash_amount'] is num
            ? (order['cash_amount'] as num).toDouble()
            : double.tryParse(order['cash_amount'].toString()) ?? initialTotalNum)
        : initialTotalNum;
    final initialCard = order['card_amount'] != null
        ? (order['card_amount'] is num
            ? (order['card_amount'] as num).toDouble()
            : double.tryParse(order['card_amount'].toString()) ?? 0.0)
        : 0.0;

    final cashController = TextEditingController(text: initialCash.toStringAsFixed(2));
    final cardController = TextEditingController(text: initialCard.toStringAsFixed(2));

    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalCtx) => Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 620),
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(modalCtx).size.height * 0.90,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 20,
            ),
            child: StatefulBuilder(
              builder: (context, setModalState) {
                final totalVal = double.tryParse(totalController.text.trim()) ?? 0.0;
                final cashVal = double.tryParse(cashController.text.trim()) ?? 0.0;
                final cardVal = double.tryParse(cardController.text.trim()) ?? 0.0;
                final isSplit = selectedPayment == 'cash_card';
                final splitSum = cashVal + cardVal;
                final isSplitValid = (splitSum - totalVal).abs() <= 0.01;
                final isTotalModified = (totalVal - initialTotalNum).abs() > 0.01;

                return SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Header: Order Title & Close
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Text(
                                'Order #$billNo',
                                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: -0.5),
                              ),
                              const SizedBox(width: 10),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: _getStatusColor(ordStatus).withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: _getStatusColor(ordStatus), width: 1),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.circle, size: 8, color: _getStatusColor(ordStatus)),
                                    const SizedBox(width: 4),
                                    Text(
                                      ordStatus.toUpperCase(),
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w800,
                                        color: _getStatusColor(ordStatus),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          IconButton(
                            onPressed: () => Navigator.pop(modalCtx),
                            icon: const Icon(Icons.close),
                            tooltip: 'Close',
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Order Metadata Card
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.black12),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: Colors.black,
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        orderType,
                                        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                    if (tableNo.isNotEmpty) ...[
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          border: Border.all(color: Colors.black26),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          'Table: $tableNo',
                                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.black87),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                if (formattedDate.isNotEmpty)
                                  Text(
                                    formattedDate,
                                    style: const TextStyle(fontSize: 12, color: Colors.black54, fontWeight: FontWeight.w500),
                                  ),
                              ],
                            ),
                            if (customerName.isNotEmpty || phone.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              const Divider(height: 1, color: Colors.black12),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  if (customerName.isNotEmpty) ...[
                                    const Icon(Icons.person_outline, size: 15, color: Colors.black54),
                                    const SizedBox(width: 4),
                                    Text(
                                      customerName,
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.black87),
                                    ),
                                  ],
                                  if (phone.isNotEmpty) ...[
                                    const SizedBox(width: 12),
                                    const Icon(Icons.phone_outlined, size: 14, color: Colors.black54),
                                    const SizedBox(width: 4),
                                    Text(
                                      phone,
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Colors.black54),
                                    ),
                                  ],
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Order Items Breakdown Section (POS Parity)
                      const Text(
                        'Order Items Breakdown',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.black87),
                      ),
                      const SizedBox(height: 6),
                      _buildItemsBreakdown(rawItems),
                      const SizedBox(height: 14),

                      // Financial Breakdown (Subtotal & Discount)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.black12),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Subtotal', style: TextStyle(fontSize: 13, color: Colors.black54)),
                                Text('₹${subtotalNum.toStringAsFixed(2)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.black87)),
                              ],
                            ),
                            if (discountNum > 0) ...[
                              const SizedBox(height: 4),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Discount', style: TextStyle(fontSize: 13, color: Colors.green)),
                                  Text('- ₹${discountNum.toStringAsFixed(2)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.green)),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Settlement Total Amount (Editable only if in active balance sheet session)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Text(
                                'Settlement Amount (₹)',
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.black87),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: canEditTotal ? Colors.black87 : Colors.grey.shade600,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  canEditTotal ? 'Active Day (Editable)' : '🔒 Locked (Closed Sheet)',
                                  style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                          if (canEditTotal && isTotalModified)
                            TextButton.icon(
                              onPressed: () {
                                setModalState(() {
                                  totalController.text = initialTotalNum.toStringAsFixed(2);
                                  if (isSplit) {
                                    cashController.text = initialTotalNum.toStringAsFixed(2);
                                    cardController.text = '0.00';
                                  }
                                });
                              },
                              icon: const Icon(Icons.undo, size: 14, color: Colors.black54),
                              label: Text(
                                'Reset (₹)',
                                style: const TextStyle(fontSize: 11, color: Colors.black54),
                              ),
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                visualDensity: VisualDensity.compact,
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: totalController,
                        enabled: canEditTotal,
                        readOnly: !canEditTotal,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        onChanged: canEditTotal
                            ? (val) {
                                setModalState(() {
                                  if (isSplit) {
                                    final newTot = double.tryParse(val) ?? 0.0;
                                    cashController.text = newTot.toStringAsFixed(2);
                                    cardController.text = '0.00';
                                  }
                                });
                              }
                            : null,
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          color: canEditTotal ? Colors.black : Colors.black54,
                        ),
                        decoration: InputDecoration(
                          prefixText: '₹ ',
                          prefixStyle: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            color: canEditTotal ? Colors.black : Colors.black54,
                          ),
                          suffixIcon: !canEditTotal
                              ? const Padding(
                                  padding: EdgeInsets.only(right: 12),
                                  child: Icon(Icons.lock, color: Colors.grey, size: 20),
                                )
                              : null,
                          hintText: '0.00',
                          filled: true,
                          fillColor: !canEditTotal
                              ? const Color(0xFFF3F4F6)
                              : (isTotalModified ? const Color(0xFFFEF3C7) : Colors.white),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          disabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: Colors.grey.shade300),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Colors.black, width: 2),
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      if (canEditTotal)
                        const Text(
                          'Order is in active balance sheet session. Total can be modified.',
                          style: TextStyle(fontSize: 11, color: Colors.black45, fontStyle: FontStyle.italic),
                        )
                      else
                        Container(
                          margin: const EdgeInsets.only(top: 4),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFFBEB),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFFDE68A)),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.lock_outline, size: 16, color: Color(0xFFB45309)),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Total is locked because this order belongs to a past/closed balance sheet session. Preserving total protects historical statements.',
                                  style: TextStyle(fontSize: 11, color: Color(0xFFB45309), fontWeight: FontWeight.w500),
                                ),
                              ),
                            ],
                          ),
                        ),
                      const SizedBox(height: 18),
                      // Payment Method Selection (POS Parity)
                      const Text(
                        'Payment Method',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.black87),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _paymentChip('Cash', 'cash', selectedPayment, () {
                            setModalState(() => selectedPayment = 'cash');
                          }),
                          _paymentChip('Card', 'card', selectedPayment, () {
                            setModalState(() => selectedPayment = 'card');
                          }),
                          _paymentChip('Cash + Card', 'cash_card', selectedPayment, () {
                            setModalState(() {
                              selectedPayment = 'cash_card';
                              final currentTotal = double.tryParse(totalController.text.trim()) ?? 0.0;
                              cashController.text = currentTotal.toStringAsFixed(2);
                              cardController.text = '0.00';
                            });
                          }),
                          _paymentChip('Swiggy', 'swiggy', selectedPayment, () {
                            setModalState(() => selectedPayment = 'swiggy');
                          }),
                          _paymentChip('Zomato', 'zomato', selectedPayment, () {
                            setModalState(() => selectedPayment = 'zomato');
                          }),
                          _paymentChip('UPI', 'upi', selectedPayment, () {
                            setModalState(() => selectedPayment = 'upi');
                          }),
                          _paymentChip('Online', 'online', selectedPayment, () {
                            setModalState(() => selectedPayment = 'online');
                          }),
                          _paymentChip('Wallet', 'wallet', selectedPayment, () {
                            setModalState(() => selectedPayment = 'wallet');
                          }),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Split Cash + Card Section
                      if (isSplit) ...[
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFBBF7D0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Split Cash & Card Amounts',
                                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF166534)),
                                  ),
                                  Wrap(
                                    spacing: 6,
                                    children: [
                                      _splitQuickChip('50/50', () {
                                        setModalState(() {
                                          final half = (totalVal / 2);
                                          cashController.text = half.toStringAsFixed(2);
                                          cardController.text = (totalVal - half).toStringAsFixed(2);
                                        });
                                      }),
                                      _splitQuickChip('All Cash', () {
                                        setModalState(() {
                                          cashController.text = totalVal.toStringAsFixed(2);
                                          cardController.text = '0.00';
                                        });
                                      }),
                                      _splitQuickChip('All Card', () {
                                        setModalState(() {
                                          cashController.text = '0.00';
                                          cardController.text = totalVal.toStringAsFixed(2);
                                        });
                                      }),
                                    ],
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text('Cash (₹)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.black87)),
                                        const SizedBox(height: 4),
                                        TextField(
                                          controller: cashController,
                                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                          onChanged: (val) {
                                            setModalState(() {
                                              final currentTot = double.tryParse(totalController.text.trim()) ?? 0.0;
                                              final cash = double.tryParse(val) ?? 0.0;
                                              final remainder = currentTot - cash;
                                              if (remainder >= 0) {
                                                cardController.text = remainder.toStringAsFixed(2);
                                              }
                                            });
                                          },
                                          decoration: InputDecoration(
                                            isDense: true,
                                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text('Card (₹)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.black87)),
                                        const SizedBox(height: 4),
                                        TextField(
                                          controller: cardController,
                                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                          onChanged: (val) {
                                            setModalState(() {
                                              final currentTot = double.tryParse(totalController.text.trim()) ?? 0.0;
                                              final card = double.tryParse(val) ?? 0.0;
                                              final remainder = currentTot - card;
                                              if (remainder >= 0) {
                                                cashController.text = remainder.toStringAsFixed(2);
                                              }
                                            });
                                          },
                                          decoration: InputDecoration(
                                            isDense: true,
                                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              if (!isSplitValid)
                                Padding(
                                  padding: const EdgeInsets.only(top: 8.0),
                                  child: Text(
                                    'Cash (₹${cashVal.toStringAsFixed(2)}) + Card (₹${cardVal.toStringAsFixed(2)}) = ₹${splitSum.toStringAsFixed(2)}, must equal Total (₹${totalVal.toStringAsFixed(2)})',
                                    style: const TextStyle(fontSize: 11, color: Colors.redAccent, fontWeight: FontWeight.w600),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Settle / Re-Settle Confirmation and Submit Button
                      ElevatedButton(
                        onPressed: isSubmitting || (isSplit && !isSplitValid)
                            ? null
                            : () async {
                                final inputTotal = double.tryParse(totalController.text.trim());
                                final total = canEditTotal ? inputTotal : initialTotalNum;
                                if (total == null || total <= 0) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Please enter a valid bill total greater than 0')),
                                  );
                                  return;
                                }

                                if (isSplit && !isSplitValid) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Cash and Card sum must match Total amount')),
                                  );
                                  return;
                                }

                                // Show Confirmation Dialog (POS Parity)
                                final isSettledAlready = ordStatus.toLowerCase() == 'settled';
                                final formattedMethod = _formatPaymentMethodName(selectedPayment);
                                final confirmed = await showDialog<bool>(
                                  context: modalCtx,
                                  builder: (confirmCtx) => AlertDialog(
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                    title: Text(
                                      isSettledAlready ? 'Re-Settle Order #$billNo?' : 'Settle Order #$billNo?',
                                      style: const TextStyle(fontWeight: FontWeight.bold),
                                    ),
                                    content: Text(
                                      'Are you sure you want to ${isSettledAlready ? "re-settle" : "settle"} Order #$billNo for ₹${total.toStringAsFixed(2)} with $formattedMethod'
                                      '${isSplit ? " (Cash: ₹${cashVal.toStringAsFixed(2)}, Card: ₹${cardVal.toStringAsFixed(2)})" : ""}?',
                                    ),
                                    actions: [
                                      TextButton(
                                        onPressed: () => Navigator.pop(confirmCtx, false),
                                        child: const Text('Cancel', style: TextStyle(color: Colors.black54)),
                                      ),
                                      ElevatedButton(
                                        onPressed: () => Navigator.pop(confirmCtx, true),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.black,
                                          foregroundColor: Colors.white,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                        ),
                                        child: Text(isSettledAlready ? 'Confirm Re-Settle' : 'Confirm Settle'),
                                      ),
                                    ],
                                  ),
                                );

                                if (confirmed != true) return;

                                setModalState(() {
                                  isSubmitting = true;
                                });

                                try {
                                  await _apiService.settleOrder(
                                    orderId: orderId,
                                    total: total,
                                    paymentMethod: selectedPayment,
                                    cashAmount: isSplit ? cashVal : null,
                                    cardAmount: isSplit ? cardVal : null,
                                  );

                                  if (modalCtx.mounted) {
                                    Navigator.pop(modalCtx);
                                  }
                                  _loadOrders();

                                  if (mounted) {
                                    ScaffoldMessenger.of(this.context).showSnackBar(
                                      SnackBar(
                                        content: Text('Order #$billNo settled for ₹${total.toStringAsFixed(2)} via $formattedMethod'),
                                        backgroundColor: Colors.black,
                                      ),
                                    );
                                  }
                                } catch (e) {
                                  setModalState(() {
                                    isSubmitting = false;
                                  });
                                  if (modalCtx.mounted) {
                                  ScaffoldMessenger.of(modalCtx).showSnackBar(
                                    SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
                                  );
                                  }
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: ordStatus.toLowerCase() == 'settled' ? Colors.grey.shade800 : Colors.black,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: isSubmitting
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : Text(
                                ordStatus.toLowerCase() == 'settled' ? 'Confirm Re-Settlement' : 'Complete Settlement',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _splitQuickChip(String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: const Color(0xFF86EFAC)),
        ),
        child: Text(
          label,
          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF166534)),
        ),
      ),
    );
  }

  Widget _buildItemsBreakdown(List items) {
    if (items.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.black12),
        ),
        child: const Text('No item details recorded for this order', style: TextStyle(color: Colors.black45, fontSize: 12, fontStyle: FontStyle.italic)),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.black12),
      ),
      padding: const EdgeInsets.all(12),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: items.length,
        separatorBuilder: (_, __) => const Divider(height: 14, color: Colors.black12),
        itemBuilder: (context, idx) {
          final item = items[idx];
          final name = _getItemName(item['menu_item_name']);
          final qty = item['quantity'] ?? 1;
          final unitPrice = (item['unit_price'] is num
              ? (item['unit_price'] as num).toDouble()
              : double.tryParse(item['unit_price']?.toString() ?? '0') ?? 0.0);
          final itemTotal = (item['item_total'] is num
              ? (item['item_total'] as num).toDouble()
              : double.tryParse(item['item_total']?.toString() ?? '0') ?? (unitPrice * (qty is num ? qty.toDouble() : 1.0)));
          final flavors = _getItemFlavors(item['menu_item_details']);
          final extras = _getItemExtras(item['extras_json']);
          final note = item['item_note']?.toString();

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Colors.black87),
                        ),
                        if (flavors.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Wrap(
                              spacing: 4,
                              runSpacing: 4,
                              children: flavors.map((f) => Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: const Color(0xFFBFDBFE)),
                                ),
                                child: Text(f, style: const TextStyle(fontSize: 10, color: Color(0xFF1D4ED8), fontWeight: FontWeight.w600)),
                              )).toList(),
                            ),
                          ),
                        if (extras.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: extras.map((e) => Padding(
                                padding: const EdgeInsets.only(bottom: 2),
                                child: Text(
                                  '+ ${e['name']} (x${e['quantity']}) - ₹${(e['total'] as double).toStringAsFixed(2)}',
                                  style: const TextStyle(fontSize: 11, color: Colors.black54),
                                ),
                              )).toList(),
                            ),
                          ),
                        if (note != null && note.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 3),
                            child: Text(
                              'Note: $note',
                              style: const TextStyle(fontSize: 11, color: Colors.orange, fontStyle: FontStyle.italic),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '₹${itemTotal.toStringAsFixed(2)}',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Colors.black),
                      ),
                      Text(
                        '$qty × ₹${unitPrice.toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 11, color: Colors.black45),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }

  String _getItemName(dynamic rawName) {
    if (rawName == null) return 'Item';
    if (rawName is String) {
      if (rawName.startsWith('{') && rawName.endsWith('}')) {
        try {
          final decoded = jsonDecode(rawName);
          if (decoded is Map) {
            return decoded['en']?.toString() ?? decoded['default']?.toString() ?? decoded.values.first?.toString() ?? rawName;
          }
        } catch (_) {}
      }
      return rawName;
    }
    if (rawName is Map) {
      return rawName['en']?.toString() ?? rawName['default']?.toString() ?? rawName.values.first?.toString() ?? 'Item';
    }
    return rawName.toString();
  }

  List<String> _getItemFlavors(dynamic details) {
    if (details == null) return [];
    List list = [];
    if (details is String) {
      try {
        final decoded = jsonDecode(details);
        if (decoded is List) list = decoded;
      } catch (_) {}
    } else if (details is List) {
      list = details;
    }
    return list.map((d) {
      if (d is Map) {
        return _getItemName(d['name']);
      }
      return d.toString();
    }).where((s) => s.isNotEmpty).toList();
  }

  List<Map<String, dynamic>> _getItemExtras(dynamic extras) {
    if (extras == null) return [];
    List list = [];
    if (extras is String) {
      try {
        final decoded = jsonDecode(extras);
        if (decoded is List) list = decoded;
      } catch (_) {}
    } else if (extras is List) {
      list = extras;
    }
    return list.map((e) {
      if (e is Map) {
        final name = _getItemName(e['name']);
        final qty = e['quantity'] ?? 1;
        final price = (e['price'] is num ? (e['price'] as num).toDouble() : double.tryParse(e['price']?.toString() ?? '0') ?? 0.0);
        return {
          'name': name,
          'quantity': qty,
          'price': price,
          'total': price * (qty is num ? qty.toDouble() : 1.0),
        };
      }
      return <String, dynamic>{};
    }).where((m) => m.isNotEmpty).toList();
  }

  String _formatPaymentMethodName(String method) {
    switch (method.toLowerCase()) {
      case 'cash':
        return 'Cash';
      case 'card':
        return 'Card';
      case 'cash_card':
        return 'Cash + Card';
      case 'swiggy':
        return 'Swiggy';
      case 'zomato':
        return 'Zomato';
      case 'upi':
        return 'UPI';
      case 'online':
        return 'Online';
      case 'wallet':
        return 'Wallet';
      default:
        return method.toUpperCase();
    }
  }

  Widget _paymentChip(String label, String value, String currentSelected, VoidCallback onTap) {
    final isSelected = value == currentSelected;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? Colors.black : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isSelected ? Colors.black : Colors.black26),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            color: isSelected ? Colors.white : Colors.black87,
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(String stat) {
    switch (stat.toLowerCase()) {
      case 'settled':
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

class _SettingsContent extends StatefulWidget {
  final Map<String, dynamic>? user;
  final bool isAdmin;
  final List<dynamic> outlets;

  const _SettingsContent({
    this.user,
    this.isAdmin = false,
    this.outlets = const [],
  });

  @override
  State<_SettingsContent> createState() => _SettingsContentState();
}

class _SettingsContentState extends State<_SettingsContent> {
  final ApiService _apiService = ApiService();
  late List<dynamic> _outlets;
  final Map<int, bool> _settlementSettings = {};
  bool _isLoadingOutlets = false;
  bool _isSavingAll = false;
  String _outletSearchQuery = '';

  int? get _effectiveBranchOutletId {
    final rawId = widget.user?['customer_id'] ??
        widget.user?['customerId'] ??
        widget.user?['outlet_id'] ??
        widget.user?['outletId'];
    if (rawId == null) return null;
    return rawId is int ? rawId : int.tryParse(rawId.toString());
  }

  String _branchOutletName = '';
  bool _isLoadingBranchSetting = false;

  @override
  void initState() {
    super.initState();
    _outlets = List<dynamic>.from(widget.outlets);
    _initSettingsFromOutlets();
    if (widget.isAdmin) {
      if (_outlets.isEmpty) {
        _loadOutlets();
      }
    } else {
      _initBranchUser();
    }
  }

  @override
  void didUpdateWidget(covariant _SettingsContent oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isAdmin) {
      if (widget.outlets != oldWidget.outlets && widget.outlets.isNotEmpty) {
        setState(() {
          _outlets = List<dynamic>.from(widget.outlets);
          _initSettingsFromOutlets();
        });
      }
    } else {
      final oldId = oldWidget.user?['customer_id'] ??
          oldWidget.user?['customerId'] ??
          oldWidget.user?['outlet_id'] ??
          oldWidget.user?['outletId'];
      final newId = _effectiveBranchOutletId;
      if (newId != oldId || (_effectiveBranchOutletId != null && _settlementSettings[_effectiveBranchOutletId] == null && !_isLoadingBranchSetting)) {
        _initBranchUser();
      }
    }
  }

  void _initBranchUser() {
    final id = _effectiveBranchOutletId;
    if (id != null && id > 0) {
      _loadBranchOutletSetting(id);
    }
  }

  Future<void> _loadBranchOutletSetting(int outletId) async {
    setState(() {
      _isLoadingBranchSetting = true;
    });
    try {
      final res = await _apiService.getSettlementSetting(outletId);
      if (res['success'] == true && res['data'] != null) {
        final data = res['data'];
        final val = data['allow_settlement_total_edit'];
        final isAllowed = val == null || val == true || val == 1 || val == '1';
        final name = data['name']?.toString() ?? 'Outlet #$outletId';
        if (mounted) {
          setState(() {
            _branchOutletName = name;
            _settlementSettings[outletId] = isAllowed;
            _isLoadingBranchSetting = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _isLoadingBranchSetting = false;
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading branch settlement setting: $e');
      if (mounted) {
        setState(() {
          _isLoadingBranchSetting = false;
        });
      }
    }
  }

  void _initSettingsFromOutlets() {
    for (final outlet in _outlets) {
      final id = outlet['id'] is int ? outlet['id'] as int : int.tryParse(outlet['id'].toString()) ?? 0;
      if (id > 0) {
        final val = outlet['allow_settlement_total_edit'];
        // Default is true unless explicitly false or 0
        _settlementSettings[id] = val == null || val == true || val == 1 || val == '1';
      }
    }
  }

  Future<void> _loadOutlets() async {
    setState(() {
      _isLoadingOutlets = true;
    });
    try {
      final outlets = await _apiService.getOutlets();
      if (mounted) {
        setState(() {
          _outlets = outlets;
          _initSettingsFromOutlets();
          _isLoadingOutlets = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingOutlets = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load outlets: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _toggleOutletSetting(int outletId, bool newValue, String outletName) async {
    final prevValue = _settlementSettings[outletId] ?? true;
    setState(() {
      _settlementSettings[outletId] = newValue;
    });

    try {
      await _apiService.updateSettlementSetting(outletId, newValue);
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(newValue
                ? 'Total editing enabled for $outletName'
                : 'Total editing disabled for $outletName (Method changes only)'),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _settlementSettings[outletId] = prevValue;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _toggleAllOutlets(bool newValue) async {
    final oldSettings = Map<int, bool>.from(_settlementSettings);
    setState(() {
      _isSavingAll = true;
      for (final outlet in _outlets) {
        final id = outlet['id'] is int ? outlet['id'] as int : int.tryParse(outlet['id'].toString()) ?? 0;
        if (id > 0) {
          _settlementSettings[id] = newValue;
        }
      }
    });

    try {
      await _apiService.updateAllSettlementSettings(newValue);
      if (mounted) {
        setState(() {
          _isSavingAll = false;
        });
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(newValue
                ? 'Settlement total editing enabled for ALL outlets'
                : 'Settlement total editing disabled for ALL outlets (Method changes only)'),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _settlementSettings.clear();
          _settlementSettings.addAll(oldSettings);
          _isSavingAll = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update all outlets: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final userName = widget.user?['firstname'] != null
        ? '${widget.user!['firstname']} ${widget.user!['lastname'] ?? ''}'.trim()
        : (widget.user?['name'] ?? 'User');
    final userEmail = widget.user?['email'] ?? '';

    // Calculate if all outlets currently have setting enabled
    final allEnabled = _settlementSettings.isNotEmpty && _settlementSettings.values.every((v) => v);

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // User Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.black12),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: Colors.black87,
                  child: Text(
                    userName.isNotEmpty ? userName[0].toUpperCase() : 'U',
                    style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        userName,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: -0.3),
                      ),
                      if (userEmail.isNotEmpty)
                        Text(
                          userEmail,
                          style: const TextStyle(fontSize: 14, color: Colors.black54),
                        ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: widget.isAdmin ? Colors.black : Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          widget.isAdmin ? 'ADMINISTRATOR' : 'OUTLET USER',
                          style: TextStyle(
                            color: widget.isAdmin ? Colors.white : Colors.black87,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      if (!widget.isAdmin && _effectiveBranchOutletId != null && _effectiveBranchOutletId! > 0) ...[
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Icon(Icons.storefront_outlined, size: 14, color: Colors.black54),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                _branchOutletName.isNotEmpty
                                    ? '$_branchOutletName (#$_effectiveBranchOutletId)'
                                    : 'Outlet #$_effectiveBranchOutletId',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.black87),
                                overflow: TextOverflow.ellipsis,
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

          const SizedBox(height: 24),

          // Settlement Permissions Section for Admin
          if (widget.isAdmin) ...[
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.black12),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x08000000),
                    blurRadius: 10,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Section Header
                  Padding(
                    padding: const EdgeInsets.all(18),
                    child: Row(
                      children: [
                        const Icon(Icons.point_of_sale_rounded, color: Colors.black, size: 24),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Settlement Permissions',
                                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Control bill total editing in POS settlement',
                                style: TextStyle(fontSize: 12, color: Colors.black54),
                              ),
                            ],
                          ),
                        ),
                        if (_isLoadingOutlets)
                          const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                          )
                        else
                          IconButton(
                            icon: const Icon(Icons.refresh, size: 20),
                            onPressed: _loadOutlets,
                            tooltip: 'Refresh outlets',
                          ),
                      ],
                    ),
                  ),

                  // Info Notice
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.amber.shade200),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.info_outline, size: 18, color: Colors.amber.shade900),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'When permission is ON (default), POS can edit the final total during settlement. When turned OFF, POS can still settle to change payment methods, but CANNOT modify the bill total.',
                            style: TextStyle(fontSize: 12, color: Colors.amber.shade900, height: 1.35),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),
                  const Divider(height: 1),

                  // Master Toggle: All Outlets
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Apply to All Outlets',
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                              ),
                              Text(
                                allEnabled
                                    ? 'Total editing allowed across all outlets'
                                    : 'Some or all outlets restricted',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: allEnabled ? Colors.green.shade700 : Colors.orange.shade800,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (_isSavingAll)
                          const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                          )
                        else
                          Switch(
                            value: allEnabled,
                            activeColor: Colors.black,
                            onChanged: _toggleAllOutlets,
                          ),
                      ],
                    ),
                  ),

                  const Divider(height: 1),

                  // Outlets List Search and Display
                  if (_outlets.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      child: TextField(
                        decoration: InputDecoration(
                          hintText: 'Search outlet by name or ID...',
                          prefixIcon: const Icon(Icons.search, size: 20),
                          isDense: true,
                          filled: true,
                          fillColor: Colors.grey.shade50,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Colors.black12),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Colors.black12),
                          ),
                        ),
                        onChanged: (val) {
                          setState(() {
                            _outletSearchQuery = val.trim().toLowerCase();
                          });
                        },
                      ),
                    ),

                  Builder(
                    builder: (context) {
                      final filteredOutlets = _outletSearchQuery.isEmpty
                          ? _outlets
                          : _outlets.where((o) {
                              final name = (o['name'] ?? '').toString().toLowerCase();
                              final id = (o['id'] ?? '').toString();
                              return name.contains(_outletSearchQuery) || id.contains(_outletSearchQuery);
                            }).toList();

                      if (filteredOutlets.isEmpty && !_isLoadingOutlets) {
                        return Padding(
                          padding: const EdgeInsets.all(24),
                          child: Center(
                            child: Text(
                              _outletSearchQuery.isEmpty
                                  ? 'No outlets found'
                                  : 'No matching outlets for "$_outletSearchQuery"',
                              style: const TextStyle(color: Colors.black45),
                            ),
                          ),
                        );
                      }

                      return ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: filteredOutlets.length,
                        separatorBuilder: (_, __) => const Divider(height: 1, indent: 16, endIndent: 16),
                        itemBuilder: (ctx, idx) {
                          final outlet = filteredOutlets[idx];
                          final id = outlet['id'] is int
                              ? outlet['id'] as int
                              : int.tryParse(outlet['id'].toString()) ?? 0;
                          final name = outlet['name'] ?? 'Outlet #$id';
                          final isEnabled = _settlementSettings[id] ?? true;

                          return Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: Colors.grey.shade200,
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              '#$id',
                                              style: TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w700,
                                                color: Colors.grey.shade800,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              name,
                                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        isEnabled
                                            ? 'Total editing enabled'
                                            : 'Total locked (methods only)',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: isEnabled ? Colors.green.shade700 : Colors.red.shade700,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Switch(
                                  value: isEnabled,
                                  activeColor: Colors.black,
                                  onChanged: (val) => _toggleOutletSetting(id, val, name),
                                ),
                              ],
                            ),
                          );
                        },
                      );
                    },
                  ),

                  const SizedBox(height: 8),
                ],
              ),
            ),
            const SizedBox(height: 32),
          ]
          // Settlement Permissions Section for Individual Branch User
          else if (_effectiveBranchOutletId != null && _effectiveBranchOutletId! > 0) ...[
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.black12),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x08000000),
                    blurRadius: 10,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Section Header
                  Padding(
                    padding: const EdgeInsets.all(18),
                    child: Row(
                      children: [
                        const Icon(Icons.point_of_sale_rounded, color: Colors.black, size: 24),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Settlement Permissions',
                                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Control bill total editing in POS settlement',
                                style: TextStyle(fontSize: 12, color: Colors.black54),
                              ),
                            ],
                          ),
                        ),
                        if (_isLoadingBranchSetting)
                          const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                          )
                        else
                          IconButton(
                            icon: const Icon(Icons.refresh, size: 20),
                            onPressed: () => _loadBranchOutletSetting(_effectiveBranchOutletId!),
                            tooltip: 'Refresh setting',
                          ),
                      ],
                    ),
                  ),

                  // Info Notice
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.amber.shade200),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.info_outline, size: 18, color: Colors.amber.shade900),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'When permission is ON (default), POS can edit the final total during settlement. When turned OFF, POS can still settle to change payment methods, but CANNOT modify the bill total.',
                            style: TextStyle(fontSize: 12, color: Colors.amber.shade900, height: 1.35),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),
                  const Divider(height: 1),

                  // Outlet Setting Row
                  Builder(
                    builder: (context) {
                      final id = _effectiveBranchOutletId!;
                      final name = _branchOutletName.isNotEmpty ? _branchOutletName : 'Outlet #$id';
                      final isEnabled = _settlementSettings[id] ?? true;

                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: Colors.grey.shade200,
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          '#$id',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                            color: Colors.grey.shade800,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          name,
                                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    isEnabled
                                        ? 'Total editing enabled'
                                        : 'Total locked (methods only)',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: isEnabled ? Colors.green.shade700 : Colors.red.shade700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Switch(
                              value: isEnabled,
                              activeColor: Colors.black,
                              onChanged: (val) => _toggleOutletSetting(id, val, name),
                            ),
                          ],
                        ),
                      );
                    },
                  ),

                  const SizedBox(height: 8),
                ],
              ),
            ),
            const SizedBox(height: 32),
          ],

          // Log Out Button
          OutlinedButton.icon(
            onPressed: () async {
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
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              side: const BorderSide(color: Colors.black87, width: 2),
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }
}

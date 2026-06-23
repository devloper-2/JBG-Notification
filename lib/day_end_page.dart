import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../widgets/outlet_picker.dart';

class DayEndPage extends StatefulWidget {
  final Map<String, dynamic>? user;
  final bool isAdmin;
  final List<dynamic> outlets;

  const DayEndPage({
    super.key,
    required this.user,
    required this.isAdmin,
    required this.outlets,
  });

  @override
  State<DayEndPage> createState() => _DayEndPageState();
}

class _DayEndPageState extends State<DayEndPage> {
  final ApiService _apiService = ApiService();
  int? _selectedOutletId;
  List<dynamic> _balanceSheets = [];
  bool _isLoading = false;

  final ScrollController _scrollController = ScrollController();
  int _visibleCount = 50;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_scrollListener);
    _initData();
  }

  void _scrollListener() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 500) {
      if (_visibleCount < _balanceSheets.length) {
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
  void didUpdateWidget(DayEndPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.outlets != oldWidget.outlets || widget.user != oldWidget.user) {
      _initData();
    }
  }

  void _initData() {
    if (widget.isAdmin &&
        widget.outlets.isNotEmpty &&
        _selectedOutletId == null) {
      _selectedOutletId = widget.outlets.first['id'] is int
          ? widget.outlets.first['id']
          : int.tryParse(widget.outlets.first['id'].toString());
      _loadData();
    } else if (!widget.isAdmin && _selectedOutletId == null) {
      _selectedOutletId = widget.user?['customer_id'];
      if (_selectedOutletId != null) {
        _loadData();
      }
    }
  }

  Future<void> _loadData() async {
    if (_selectedOutletId == null) return;

    if (mounted) {
      setState(() {
        _isLoading = true;
      });
    }

    try {
      final resp = await _apiService.getDailyBalanceSheet(_selectedOutletId!);
      if (mounted) {
        setState(() {
          _balanceSheets = resp['data'] ?? [];
          _visibleCount = 50;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading balance sheets: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _balanceSheets = [];
        });
      }
    }
  }

  String formatCurrency(dynamic amount) {
    if (amount == null) return '0.00';
    double val = amount is String ? double.tryParse(amount) ?? 0.0 : amount;
    return val.toStringAsFixed(2);
  }

  String formatDate(String? dateStr) {
    if (dateStr == null) return 'N/A';
    try {
      final dt = DateTime.parse(dateStr).toLocal();
      return '${dt.day.toString().padLeft(2, '0')}-${dt.month.toString().padLeft(2, '0')}-${dt.year}';
    } catch (e) {
      return dateStr;
    }
  }

  String formatTime(String? dateStr) {
    if (dateStr == null) return 'N/A';
    try {
      final dt = DateTime.parse(dateStr).toLocal();
      final hour = dt.hour == 0 ? 12 : (dt.hour > 12 ? dt.hour - 12 : dt.hour);
      final min = dt.minute.toString().padLeft(2, '0');
      final ampm = dt.hour >= 12 ? 'PM' : 'AM';
      return '${dt.day.toString().padLeft(2, '0')}-${dt.month.toString().padLeft(2, '0')}-${dt.year} $hour:$min $ampm';
    } catch (e) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (widget.isAdmin)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: OutletPickerField(
              outlets: widget.outlets,
              selectedOutletId: _selectedOutletId,
              onChanged: (val) {
                setState(() {
                  _selectedOutletId = val;
                });
                if (val != null) {
                  _loadData();
                }
              },
            ),
          ),
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _balanceSheets.isEmpty
              ? const Center(
                  child: Text(
                    "No Day End data available",
                    style: TextStyle(fontSize: 16),
                  ),
                )
              : ListView.separated(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: _visibleCount > _balanceSheets.length ? _balanceSheets.length : _visibleCount,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: 16),
                  itemBuilder: (context, index) {
                    final sheet = _balanceSheets[index];
                    final double cash = double.tryParse(sheet['sale_amount_cash']?.toString() ?? '0') ?? 0.0;
                    final double card = double.tryParse(sheet['sale_amount_card']?.toString() ?? '0') ?? 0.0;
                    final double swiggy = double.tryParse(sheet['sale_amount_swiggy']?.toString() ?? '0') ?? 0.0;
                    final double zomato = double.tryParse(sheet['sale_amount_zomato']?.toString() ?? '0') ?? 0.0;
                    final double totalSales = cash + card + swiggy + zomato;

                    return Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.04),
                            blurRadius: 12,
                            offset: const Offset(0, 6),
                          ),
                        ],
                        border: Border.all(color: Colors.grey.shade100, width: 1.5),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Header Section
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.grey.shade100,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(
                                  Icons.summarize_rounded,
                                  color: Colors.black87,
                                  size: 22,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      "Start: ${formatTime(sheet['day_start_time'])}",
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                        color: Colors.black87,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      "End: ${sheet['status'] == 'closed' ? formatTime(sheet['day_end_time']) : 'In Progress'}",
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                        color: sheet['status'] == 'closed'
                                            ? Colors.black54
                                            : Colors.green.shade700,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: sheet['status'] == 'closed'
                                      ? Colors.red.shade50
                                      : Colors.green.shade50,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: sheet['status'] == 'closed'
                                        ? Colors.red.shade100
                                        : Colors.green.shade100,
                                  ),
                                ),
                                child: Text(
                                  (sheet['status'] ?? 'unknown').toUpperCase(),
                                  style: TextStyle(
                                    color: sheet['status'] == 'closed'
                                        ? Colors.red.shade800
                                        : Colors.green.shade800,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 10,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          const Divider(height: 1, color: Colors.black12),
                          const SizedBox(height: 16),

                          // Sales Breakdown Section
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: Colors.orange.shade50.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.orange.shade100.withOpacity(0.5)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      children: [
                                        Icon(Icons.analytics_rounded, color: Colors.orange.shade800, size: 20),
                                        const SizedBox(width: 8),
                                        const Text(
                                          "TOTAL SALES",
                                          style: TextStyle(
                                            fontWeight: FontWeight.w900,
                                            fontSize: 13,
                                            color: Colors.black87,
                                            letterSpacing: 0.5,
                                          ),
                                        ),
                                      ],
                                    ),
                                    Text(
                                      "₹${formatCurrency(totalSales)}",
                                      style: TextStyle(
                                        fontWeight: FontWeight.w900,
                                        fontSize: 18,
                                        color: Colors.orange.shade900,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                const Divider(color: Colors.black12, height: 1),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Expanded(
                                      child: _buildInfoTile(
                                        icon: Icons.money_rounded,
                                        iconColor: Colors.green.shade600,
                                        label: "Cash Sales",
                                        value: "₹${formatCurrency(cash)}",
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: _buildInfoTile(
                                        icon: Icons.credit_card_rounded,
                                        iconColor: Colors.blue.shade600,
                                        label: "Card Sales",
                                        value: "₹${formatCurrency(card)}",
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Expanded(
                                      child: _buildInfoTile(
                                        icon: Icons.delivery_dining_rounded,
                                        iconColor: Colors.deepOrange.shade600,
                                        label: "Swiggy Sales",
                                        value: "₹${formatCurrency(swiggy)}",
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: _buildInfoTile(
                                        icon: Icons.restaurant_rounded,
                                        iconColor: Colors.red.shade600,
                                        label: "Zomato Sales",
                                        value: "₹${formatCurrency(zomato)}",
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Cash Flow & Drawer Section
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.grey.shade200),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(Icons.account_balance_wallet_rounded, color: Colors.blueGrey.shade700, size: 18),
                                    const SizedBox(width: 8),
                                    const Text(
                                      "CASH FLOW & DRAWER",
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                        color: Colors.black54,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                const Divider(color: Colors.black12, height: 1),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Expanded(
                                      child: _buildInfoTile(
                                        icon: Icons.play_for_work_rounded,
                                        iconColor: Colors.teal.shade600,
                                        label: "Starting Cash",
                                        value: "₹${formatCurrency(sheet['starting_balance'])}",
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: _buildInfoTile(
                                        icon: Icons.add_circle_outline_rounded,
                                        iconColor: Colors.indigo.shade600,
                                        label: "Added Cash",
                                        value: "₹${formatCurrency(sheet['add_balance'])}",
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Expanded(
                                      child: _buildInfoTile(
                                        icon: Icons.trending_down_rounded,
                                        iconColor: Colors.red.shade600,
                                        label: "Expenses Paid",
                                        value: "₹${formatCurrency(sheet['expense_amount'])}",
                                        valueColor: Colors.red.shade800,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: _buildInfoTile(
                                        icon: Icons.outbox_rounded,
                                        iconColor: Colors.purple.shade600,
                                        label: "Withdrawn Cash",
                                        value: "₹${formatCurrency(sheet['withdraw_balance'])}",
                                        valueColor: Colors.purple.shade800,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 14),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: Colors.blueGrey.shade50.withOpacity(0.5),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: Colors.blueGrey.shade100.withOpacity(0.4)),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Text(
                                        "Expected Closing Cash",
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13,
                                          color: Colors.black87,
                                        ),
                                      ),
                                      Text(
                                        "₹${formatCurrency(sheet['closing_balance'])}",
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w900,
                                          fontSize: 15,
                                          color: Colors.black,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildInfoTile({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
    Color? valueColor,
    bool isBoldValue = false,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: iconColor.withOpacity(0.08),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 16, color: iconColor),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 1),
              Text(
                value,
                style: TextStyle(
                  fontWeight: isBoldValue ? FontWeight.w900 : FontWeight.bold,
                  fontSize: isBoldValue ? 15 : 13,
                  color: valueColor ?? Colors.black87,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

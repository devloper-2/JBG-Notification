import 'package:flutter/material.dart';
import '../services/api_service.dart';

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

  @override
  void initState() {
    super.initState();
    _initData();
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
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.black26),
                borderRadius: BorderRadius.circular(12),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<int>(
                  isExpanded: true,
                  value: _selectedOutletId,
                  icon: const Icon(
                    Icons.keyboard_arrow_down,
                    color: Colors.black,
                  ),
                  hint: const Text(
                    'Select Outlet',
                    style: TextStyle(color: Colors.black54),
                  ),
                  style: const TextStyle(
                    color: Colors.black,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                  items: widget.outlets
                      .where((o) => o['id'] != null)
                      .map<DropdownMenuItem<int>>((outlet) {
                        return DropdownMenuItem<int>(
                          value: outlet['id'] is int
                              ? outlet['id']
                              : int.tryParse(outlet['id'].toString()),
                          child: Text(outlet['name'] ?? 'Unknown Outlet'),
                        );
                      })
                      .toList(),
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
                  padding: const EdgeInsets.all(16),
                  itemCount: _balanceSheets.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: 16),
                  itemBuilder: (context, index) {
                    final sheet = _balanceSheets[index];
                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 10,
                            offset: const Offset(0, 5),
                          ),
                        ],
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    "Start: ${formatTime(sheet['day_start_time'])}",
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    "End: ${sheet['status'] == 'closed' ? formatTime(sheet['day_end_time']) : 'In Progress'}",
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                      color: Colors.black54,
                                    ),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: sheet['status'] == 'closed'
                                      ? Colors.red.shade100
                                      : Colors.green.shade100,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  (sheet['status'] ?? 'unknown').toUpperCase(),
                                  style: TextStyle(
                                    color: sheet['status'] == 'closed'
                                        ? Colors.red.shade800
                                        : Colors.green.shade800,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const Divider(height: 24),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              _buildInfoColumn(
                                "Starting Balance",
                                "\u20B9${formatCurrency(sheet['starting_balance'])}",
                              ),
                              _buildInfoColumn(
                                "Closing Balance",
                                "\u20B9${formatCurrency(sheet['closing_balance'])}",
                                alignment: CrossAxisAlignment.end,
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              _buildInfoColumn(
                                "Add Balance",
                                "\u20B9${formatCurrency(sheet['add_balance'])}",
                              ),
                              _buildInfoColumn(
                                "Total Sale Amount",
                                "\u20B9${formatCurrency(sheet['sale_amount'])}",
                                alignment: CrossAxisAlignment.end,
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              _buildInfoColumn(
                                "Cash Sales",
                                "\u20B9${formatCurrency(sheet['sale_amount_cash'])}",
                              ),
                              _buildInfoColumn(
                                "Card Sales",
                                "\u20B9${formatCurrency(sheet['sale_amount_card'])}",
                                alignment: CrossAxisAlignment.end,
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              _buildInfoColumn(
                                "Swiggy Sales",
                                "\u20B9${formatCurrency(sheet['sale_amount_swiggy'])}",
                              ),
                              _buildInfoColumn(
                                "Zomato Sales",
                                "\u20B9${formatCurrency(sheet['sale_amount_zomato'])}",
                                alignment: CrossAxisAlignment.end,
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              _buildInfoColumn(
                                "Expense Amount",
                                "\u20B9${formatCurrency(sheet['expense_amount'])}",
                              ),
                              _buildInfoColumn(
                                "Withdraw Balance",
                                "\u20B9${formatCurrency(sheet['withdraw_balance'])}",
                                alignment: CrossAxisAlignment.end,
                              ),
                            ],
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

  Widget _buildInfoColumn(
    String label,
    String value, {
    CrossAxisAlignment alignment = CrossAxisAlignment.start,
  }) {
    return Column(
      crossAxisAlignment: alignment,
      children: [
        Text(
          label,
          style: TextStyle(
            color: Colors.grey.shade600,
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
      ],
    );
  }
}

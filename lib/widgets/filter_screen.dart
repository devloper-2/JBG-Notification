import 'package:flutter/material.dart';
import 'date_filter_sheet.dart';

class FilterScreen extends StatefulWidget {
  final String initialPaymentMethod;
  final String initialStatus;
  final String initialOrderType;
  final DateTime? initialStartDate;
  final DateTime? initialEndDate;

  const FilterScreen({
    super.key,
    required this.initialPaymentMethod,
    required this.initialStatus,
    required this.initialOrderType,
    this.initialStartDate,
    this.initialEndDate,
  });

  @override
  State<FilterScreen> createState() => _FilterScreenState();
}

class _FilterScreenState extends State<FilterScreen> {
  late String _paymentMethod;
  late String _status;
  late String _orderType;
  DateTime? _startDate;
  DateTime? _endDate;

  @override
  void initState() {
    super.initState();
    _paymentMethod = widget.initialPaymentMethod;
    _status = widget.initialStatus;
    _orderType = widget.initialOrderType;
    _startDate = widget.initialStartDate;
    _endDate = widget.initialEndDate;
  }

  void _clearFilters() {
    setState(() {
      _paymentMethod = 'all';
      _status = 'all';
      _orderType = 'all';
      _startDate = null;
      _endDate = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Filters',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: _clearFilters,
            child: const Text('Clear All', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSectionTitle('Date Range'),
                    const SizedBox(height: 12),
                    GestureDetector(
                      onTap: () async {
                        final result = await showModalBottomSheet<Map<String, dynamic>>(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: Colors.transparent,
                          builder: (context) => DateFilterSheet(
                            initialStartDate: _startDate,
                            initialEndDate: _endDate,
                          ),
                        );
                        if (result != null) {
                          setState(() {
                            _startDate = result['start'];
                            _endDate = result['end'];
                          });
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(12),
                          color: Colors.grey.shade50,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Selected Dates', style: TextStyle(color: Colors.black54, fontSize: 12)),
                                const SizedBox(height: 4),
                                Text(
                                  (_startDate != null || _endDate != null)
                                      ? '${_startDate != null ? "${_startDate!.year}-${_startDate!.month.toString().padLeft(2, '0')}-${_startDate!.day.toString().padLeft(2, '0')}" : "Select"} - ${_endDate != null ? "${_endDate!.year}-${_endDate!.month.toString().padLeft(2, '0')}-${_endDate!.day.toString().padLeft(2, '0')}" : "Select"}'
                                      : 'Any dates',
                                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                                ),
                              ],
                            ),
                            Icon(Icons.calendar_today, color: Colors.blue.shade600),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),
                    
                    _buildSectionTitle('Payment Method'),
                    const SizedBox(height: 12),
                    _buildOptionsGrid(
                      options: ['all', 'cash', 'card', 'swigy', 'zomato', 'online'],
                      labels: ['All', 'Cash', 'Card', 'Swiggy', 'Zomato', 'Online'],
                      selectedValue: _paymentMethod,
                      onSelected: (v) => setState(() => _paymentMethod = v),
                    ),
                    const SizedBox(height: 32),

                    _buildSectionTitle('Status'),
                    const SizedBox(height: 12),
                    _buildOptionsGrid(
                      options: ['all', 'pending', 'preparing', 'ready', 'completed', 'cancelled'],
                      labels: ['All', 'Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'],
                      selectedValue: _status,
                      onSelected: (v) => setState(() => _status = v),
                    ),
                    const SizedBox(height: 32),

                    _buildSectionTitle('Order Type'),
                    const SizedBox(height: 12),
                    _buildOptionsGrid(
                      options: ['all', 'dine_in', 'takeaway', 'delivery'],
                      labels: ['All', 'Dine In', 'Takeaway', 'Delivery'],
                      selectedValue: _orderType,
                      onSelected: (v) => setState(() => _orderType = v),
                    ),
                  ],
                ),
              ),
            ),
            // Apply Button
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -5),
                  )
                ],
              ),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context, {
                      'paymentMethod': _paymentMethod,
                      'status': _status,
                      'orderType': _orderType,
                      'startDate': _startDate,
                      'endDate': _endDate,
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.black,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Apply Filters', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _buildOptionsGrid({
    required List<String> options,
    required List<String> labels,
    required String selectedValue,
    required Function(String) onSelected,
  }) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: List.generate(options.length, (index) {
        final option = options[index];
        final label = labels[index];
        final isSelected = selectedValue == option;

        return GestureDetector(
          onTap: () => onSelected(option),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: isSelected ? Colors.blue.shade50 : Colors.white,
              border: Border.all(
                color: isSelected ? Colors.blue.shade600 : Colors.grey.shade300,
                width: isSelected ? 2 : 1,
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.blue.shade700 : Colors.black87,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ),
        );
      }),
    );
  }
}
import 'package:flutter/material.dart';
import 'services/api_service.dart';
import 'widgets/outlet_picker.dart';

class ExpensesPage extends StatefulWidget {
  final Map<String, dynamic>? user;
  final bool isAdmin;
  final List<dynamic> outlets;

  const ExpensesPage({
    super.key,
    required this.user,
    required this.isAdmin,
    required this.outlets,
  });

  @override
  State<ExpensesPage> createState() => _ExpensesPageState();
}

class _ExpensesPageState extends State<ExpensesPage> {
  final ApiService _apiService = ApiService();
  final TextEditingController _searchController = TextEditingController();

  int? _selectedOutletId;
  List<dynamic> _allExpenses = [];
  List<dynamic> _categories = [];
  Map<String, String> _categoryMap = {};

  bool _isLoading = false;
  String _dateFilterType = 'today'; // 'today', 'all', 'custom'
  DateTimeRange? _customDateRange;
  int? _selectedCategoryId;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _initData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(ExpensesPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.outlets != oldWidget.outlets || widget.user != oldWidget.user) {
      _initData();
    }
  }

  void _initData() {
    if (widget.isAdmin && widget.outlets.isNotEmpty && _selectedOutletId == null) {
      _selectedOutletId = widget.outlets.first['id'] is int
          ? widget.outlets.first['id']
          : int.tryParse(widget.outlets.first['id'].toString());
      _loadCategoriesAndExpenses();
    } else if (!widget.isAdmin && _selectedOutletId == null) {
      _selectedOutletId = widget.user?['customer_id'];
      if (_selectedOutletId != null) {
        _loadCategoriesAndExpenses();
      }
    }
  }

  Future<void> _loadCategoriesAndExpenses() async {
    if (_selectedOutletId == null) return;
    await Future.wait([
      _loadCategories(),
      _loadExpenses(),
    ]);
  }

  Future<void> _loadCategories() async {
    if (_selectedOutletId == null) return;
    try {
      final cats = await _apiService.getExpenseCategories(_selectedOutletId!);
      if (mounted) {
        setState(() {
          _categories = cats;
          _categoryMap = {
            for (var c in cats) c['id'].toString(): c['name']?.toString() ?? ''
          };
        });
      }
    } catch (e) {
      debugPrint('Error loading expense categories: $e');
    }
  }

  Future<void> _loadExpenses() async {
    if (_selectedOutletId == null) return;

    if (mounted) {
      setState(() {
        _isLoading = true;
      });
    }

    try {
      String? startDate;
      String? endDate;

      if (_dateFilterType == 'today') {
        final now = DateTime.now();
        startDate = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
        endDate = startDate;
      } else if (_dateFilterType == 'custom' && _customDateRange != null) {
        final s = _customDateRange!.start;
        final e = _customDateRange!.end;
        startDate = '${s.year}-${s.month.toString().padLeft(2, '0')}-${s.day.toString().padLeft(2, '0')}';
        endDate = '${e.year}-${e.month.toString().padLeft(2, '0')}-${e.day.toString().padLeft(2, '0')}';
      }

      final resp = await _apiService.getAdminExpenses(
        _selectedOutletId!,
        startDate: startDate,
        endDate: endDate,
        page: 1,
        limit: 500,
      );

      if (mounted) {
        final list = resp['data'] ?? [];
        setState(() {
          _allExpenses = list is List ? list : [];
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading expenses: $e');
      if (mounted) {
        setState(() {
          _allExpenses = [];
          _isLoading = false;
        });
      }
    }
  }

  List<dynamic> get _filteredExpenses {
    return _allExpenses.where((exp) {
      // Category filter
      if (_selectedCategoryId != null) {
        final catId = exp['category_id'];
        if (catId == null || catId.toString() != _selectedCategoryId.toString()) {
          return false;
        }
      }

      // Search query filter
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final desc = (exp['description'] ?? '').toString().toLowerCase();
        final amount = (exp['amount'] ?? '').toString().toLowerCase();
        final catName = (_categoryMap[exp['category_id']?.toString()] ?? '').toLowerCase();
        if (!desc.contains(q) && !amount.contains(q) && !catName.contains(q)) {
          return false;
        }
      }

      return true;
    }).toList();
  }

  double get _totalFilteredAmount {
    double sum = 0.0;
    for (var exp in _filteredExpenses) {
      final amt = exp['amount'];
      final val = amt is num ? amt.toDouble() : double.tryParse(amt?.toString() ?? '0') ?? 0.0;
      sum += val;
    }
    return sum;
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return 'N/A';
    try {
      final dt = DateTime.parse(dateStr).toLocal();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      final hour = dt.hour == 0 ? 12 : (dt.hour > 12 ? dt.hour - 12 : dt.hour);
      final min = dt.minute.toString().padLeft(2, '0');
      final ampm = dt.hour >= 12 ? 'PM' : 'AM';
      return '${dt.day.toString().padLeft(2, '0')} ${months[dt.month - 1]} ${dt.year}, $hour:$min $ampm';
    } catch (e) {
      return dateStr;
    }
  }

  Future<void> _pickCustomDateRange() async {
    final now = DateTime.now();
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      initialDateRange: _customDateRange ?? DateTimeRange(
        start: now.subtract(const Duration(days: 7)),
        end: now,
      ),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Colors.black,
              onPrimary: Colors.white,
              onSurface: Colors.black,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _dateFilterType = 'custom';
        _customDateRange = picked;
      });
      _loadExpenses();
    }
  }

  void _showAddExpenseModal({Map<String, dynamic>? existingExpense}) {
    final isEditing = existingExpense != null;
    final descController = TextEditingController(text: existingExpense?['description']?.toString() ?? '');
    final amountController = TextEditingController(
      text: existingExpense != null ? existingExpense['amount']?.toString() ?? '' : '',
    );
    int? categoryId;
    if (existingExpense != null && existingExpense['category_id'] != null) {
      final rawCat = existingExpense['category_id'];
      categoryId = rawCat is int ? rawCat : int.tryParse(rawCat.toString());
    }

    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalCtx) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 24,
            bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isEditing ? 'Edit Expense' : 'Add New Expense',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: -0.5),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(modalCtx),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // Description
              TextField(
                controller: descController,
                decoration: InputDecoration(
                  labelText: 'Description',
                  hintText: 'e.g., Milk, Vegetables, Cleaning supplies',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Colors.black, width: 2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              // Amount
              TextField(
                controller: amountController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                  labelText: 'Amount (₹)',
                  hintText: '0.00',
                  prefixText: '₹ ',
                  prefixStyle: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Colors.black, width: 2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              // Category Dropdown
              DropdownButtonFormField<int?>(
                value: categoryId,
                decoration: InputDecoration(
                  labelText: 'Category (Optional)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Colors.black, width: 2),
                  ),
                ),
                items: [
                  const DropdownMenuItem<int?>(
                    value: null,
                    child: Text('No Category'),
                  ),
                  ..._categories.map((c) {
                    final id = c['id'] is int ? c['id'] as int : int.tryParse(c['id'].toString());
                    return DropdownMenuItem<int?>(
                      value: id,
                      child: Text(c['name']?.toString() ?? 'Category'),
                    );
                  }),
                ],
                onChanged: (val) {
                  setModalState(() {
                    categoryId = val;
                  });
                },
              ),
              const SizedBox(height: 24),
              // Submit button
              ElevatedButton(
                onPressed: isSubmitting
                    ? null
                    : () async {
                        final desc = descController.text.trim();
                        final amt = double.tryParse(amountController.text.trim());

                        if (desc.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Please enter a description')),
                          );
                          return;
                        }
                        if (amt == null || amt <= 0) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Please enter a valid amount greater than 0')),
                          );
                          return;
                        }

                        setModalState(() {
                          isSubmitting = true;
                        });

                        try {
                          if (isEditing) {
                            final expId = existingExpense['id'] is int
                                ? existingExpense['id']
                                : int.parse(existingExpense['id'].toString());
                            await _apiService.updateExpense(
                              outletId: _selectedOutletId!,
                              expenseId: expId,
                              description: desc,
                              amount: amt,
                              categoryId: categoryId,
                            );
                          } else {
                            await _apiService.addExpense(
                              outletId: _selectedOutletId!,
                              description: desc,
                              amount: amt,
                              categoryId: categoryId,
                            );
                          }

                          if (modalCtx.mounted) {
                            Navigator.pop(modalCtx);
                          }
                          _loadExpenses();
                          if (mounted) {
                            ScaffoldMessenger.of(this.context).showSnackBar(
                              SnackBar(
                                content: Text(isEditing ? 'Expense updated' : 'Expense added successfully'),
                                backgroundColor: Colors.black,
                              ),
                            );
                          }
                        } catch (e) {
                          setModalState(() {
                            isSubmitting = false;
                          });
                          ScaffoldMessenger.of(modalCtx).showSnackBar(
                            SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
                          );
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.black,
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
                        isEditing ? 'Save Changes' : 'Add Expense',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _confirmDeleteExpense(Map<String, dynamic> expense) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Expense', style: TextStyle(fontWeight: FontWeight.bold)),
        content: Text('Are you sure you want to delete "${expense['description']}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: Colors.black54)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade600,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && _selectedOutletId != null) {
      try {
        final expId = expense['id'] is int ? expense['id'] : int.parse(expense['id'].toString());
        await _apiService.deleteExpense(outletId: _selectedOutletId!, expenseId: expId);
        _loadExpenses();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Expense deleted successfully'), backgroundColor: Colors.black),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredExpenses;

    return Column(
      children: [
        // Top section with Outlet Selector (for admin)
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
                  _loadCategoriesAndExpenses();
                }
              },
            ),
          ),
        // Search & Filter Bar
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
          child: Column(
            children: [
              // Search field + Add button
              Row(
                children: [
                  Expanded(
                    child: Container(
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: TextField(
                        controller: _searchController,
                        onChanged: (val) {
                          setState(() {
                            _searchQuery = val;
                          });
                        },
                        decoration: InputDecoration(
                          hintText: 'Search description, amount...',
                          hintStyle: TextStyle(color: Colors.grey.shade500, fontSize: 14),
                          prefixIcon: const Icon(Icons.search, size: 20, color: Colors.black54),
                          suffixIcon: _searchQuery.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear, size: 18),
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() {
                                      _searchQuery = '';
                                    });
                                  },
                                )
                              : null,
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton.icon(
                    onPressed: () => _showAddExpenseModal(),
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Add'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              // Filter chips / controls
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    // Date filters: Today, All, Custom
                    _buildFilterChip('Today', _dateFilterType == 'today', () {
                      setState(() {
                        _dateFilterType = 'today';
                        _customDateRange = null;
                      });
                      _loadExpenses();
                    }),
                    const SizedBox(width: 8),
                    _buildFilterChip('All', _dateFilterType == 'all', () {
                      setState(() {
                        _dateFilterType = 'all';
                        _customDateRange = null;
                      });
                      _loadExpenses();
                    }),
                    const SizedBox(width: 8),
                    _buildFilterChip(
                      _dateFilterType == 'custom' && _customDateRange != null
                          ? '${_customDateRange!.start.day}/${_customDateRange!.start.month} - ${_customDateRange!.end.day}/${_customDateRange!.end.month}'
                          : 'Custom Date',
                      _dateFilterType == 'custom',
                      _pickCustomDateRange,
                      icon: Icons.calendar_today,
                    ),
                    const SizedBox(width: 12),
                    Container(height: 24, width: 1, color: Colors.black12),
                    const SizedBox(width: 12),
                    // Category dropdown chip
                    DropdownButtonHideUnderline(
                      child: DropdownButton<int?>(
                        value: _selectedCategoryId,
                        isDense: true,
                        hint: const Text('All Categories', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        items: [
                          const DropdownMenuItem<int?>(
                            value: null,
                            child: Text('All Categories', style: TextStyle(fontSize: 13)),
                          ),
                          ..._categories.map((cat) {
                            final id = cat['id'] is int ? cat['id'] as int : int.tryParse(cat['id'].toString());
                            return DropdownMenuItem<int?>(
                              value: id,
                              child: Text(cat['name']?.toString() ?? 'Category', style: const TextStyle(fontSize: 13)),
                            );
                          }),
                        ],
                        onChanged: (val) {
                          setState(() {
                            _selectedCategoryId = val;
                          });
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1, color: Colors.black12),
        // Summary Header Card
        if (!_isLoading && _allExpenses.isNotEmpty)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            color: Colors.white,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total Expenses', style: TextStyle(color: Colors.black54, fontSize: 13)),
                    const SizedBox(height: 2),
                    Text(
                      '${filtered.length} expense${filtered.length == 1 ? '' : 's'}',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: Colors.black),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text('Total Amount', style: TextStyle(color: Colors.black54, fontSize: 13)),
                    const SizedBox(height: 2),
                    Text(
                      '₹${_totalFilteredAmount.toStringAsFixed(2)}',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: Colors.redAccent),
                    ),
                  ],
                ),
              ],
            ),
          ),
        if (!_isLoading && _allExpenses.isNotEmpty)
          const Divider(height: 1, color: Colors.black12),
        // Expenses List
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(color: Colors.black))
              : filtered.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.receipt_long_outlined, size: 48, color: Colors.grey.shade400),
                          const SizedBox(height: 12),
                          Text(
                            _searchQuery.isNotEmpty ? 'No matching expenses found' : 'No expenses recorded',
                            style: TextStyle(fontSize: 16, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      color: Colors.black,
                      onRefresh: _loadExpenses,
                      child: ListView.builder(
                        itemCount: filtered.length,
                        padding: const EdgeInsets.only(top: 8, bottom: 24),
                        itemBuilder: (context, index) {
                          final expense = filtered[index];
                          final desc = expense['description']?.toString() ?? 'Expense';
                          final amt = expense['amount'];
                          final amtNum = amt is num ? amt.toDouble() : double.tryParse(amt?.toString() ?? '0') ?? 0.0;
                          final dateStr = expense['created_at']?.toString();
                          final catId = expense['category_id']?.toString();
                          final catName = catId != null ? _categoryMap[catId] : null;

                          return Container(
                            margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.black12, width: 1.2),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.02),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Icon
                                      Container(
                                        width: 42,
                                        height: 42,
                                        decoration: BoxDecoration(
                                          color: Colors.grey.shade100,
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: const Icon(Icons.receipt_outlined, color: Colors.black87, size: 22),
                                      ),
                                      const SizedBox(width: 14),
                                      // Description + Date
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              desc,
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w800,
                                                fontSize: 16,
                                                color: Colors.black,
                                                letterSpacing: -0.2,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Row(
                                              children: [
                                                const Icon(Icons.access_time, size: 12, color: Colors.black45),
                                                const SizedBox(width: 4),
                                                Text(
                                                  _formatDate(dateStr),
                                                  style: const TextStyle(color: Colors.black54, fontSize: 12),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                      // Amount
                                      Text(
                                        '-₹${amtNum.toStringAsFixed(2)}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w900,
                                          fontSize: 17,
                                          color: Colors.redAccent,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  const Divider(height: 1, color: Colors.black12),
                                  const SizedBox(height: 10),
                                  // Bottom Row: Category Badge + Actions
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      if (catName != null && catName.isNotEmpty)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: Colors.grey.shade100,
                                            borderRadius: BorderRadius.circular(6),
                                            border: Border.all(color: Colors.black12),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(Icons.local_offer_outlined, size: 12, color: Colors.black54),
                                              const SizedBox(width: 4),
                                              Text(
                                                catName,
                                                style: const TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w700,
                                                  color: Colors.black87,
                                                ),
                                              ),
                                            ],
                                          ),
                                        )
                                      else
                                        const SizedBox.shrink(),
                                      // Action buttons
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          InkWell(
                                            borderRadius: BorderRadius.circular(8),
                                            onTap: () => _showAddExpenseModal(existingExpense: expense),
                                            child: Padding(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              child: Row(
                                                children: [
                                                  Icon(Icons.edit_outlined, size: 15, color: Colors.grey.shade700),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    'Edit',
                                                    style: TextStyle(
                                                      fontSize: 12,
                                                      fontWeight: FontWeight.w600,
                                                      color: Colors.grey.shade800,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          InkWell(
                                            borderRadius: BorderRadius.circular(8),
                                            onTap: () => _confirmDeleteExpense(expense),
                                            child: const Padding(
                                              padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              child: Row(
                                                children: [
                                                  Icon(Icons.delete_outline, size: 15, color: Colors.redAccent),
                                                  SizedBox(width: 4),
                                                  Text(
                                                    'Delete',
                                                    style: TextStyle(
                                                      fontSize: 12,
                                                      fontWeight: FontWeight.w600,
                                                      color: Colors.redAccent,
                                                    ),
                                                  ),
                                                ],
                                              ),
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
        ),
      ],
    );
  }

  Widget _buildFilterChip(String label, bool isSelected, VoidCallback onTap, {IconData? icon}) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? Colors.black : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? Colors.black : Colors.black26),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 13, color: isSelected ? Colors.white : Colors.black87),
              const SizedBox(width: 4),
            ],
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : Colors.black87,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

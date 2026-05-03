import 'package:flutter/material.dart';

class DateFilterSheet extends StatefulWidget {
  final DateTime? initialStartDate;
  final DateTime? initialEndDate;

  const DateFilterSheet({
    super.key,
    this.initialStartDate,
    this.initialEndDate,
  });

  @override
  State<DateFilterSheet> createState() => _DateFilterSheetState();
}

class _DateFilterSheetState extends State<DateFilterSheet> {
  bool isSelectingStart = true;
  DateTime? startDate;
  DateTime? endDate;

  @override
  void initState() {
    super.initState();
    startDate = widget.initialStartDate;
    endDate = widget.initialEndDate;
  }

  String _formatDate(DateTime date) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).padding.bottom + 20,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              InkWell(
                onTap: () => Navigator.pop(context),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.close, size: 20),
                ),
              ),
              const Expanded(
                child: Text(
                  'Set your date',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
              // Dummy element to balance the row layout
              const SizedBox(width: 36),
            ],
          ),
          const SizedBox(height: 24),

          // Date Selection Segments (Start / End)
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => isSelectingStart = true),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: isSelectingStart ? Colors.white : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: isSelectingStart
                            ? [
                                const BoxShadow(
                                  color: Colors.black12,
                                  blurRadius: 4,
                                  offset: Offset(0, 2),
                                )
                              ]
                            : [],
                      ),
                      child: Text(
                        startDate != null ? _formatDate(startDate!) : 'Start date',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: isSelectingStart ? Colors.blue.shade700 : Colors.black54,
                          fontWeight: isSelectingStart ? FontWeight.bold : FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => isSelectingStart = false),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: !isSelectingStart ? Colors.white : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: !isSelectingStart
                            ? [
                                const BoxShadow(
                                  color: Colors.black12,
                                  blurRadius: 4,
                                  offset: Offset(0, 2),
                                )
                              ]
                            : [],
                      ),
                      child: Text(
                        endDate != null ? _formatDate(endDate!) : 'End date',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: !isSelectingStart ? Colors.blue.shade700 : Colors.black54,
                          fontWeight: !isSelectingStart ? FontWeight.bold : FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Calendar
          SizedBox(
            height: 300,
            child: Theme(
              data: Theme.of(context).copyWith(
                colorScheme: ColorScheme.light(
                  primary: Colors.blue.shade600,
                  onPrimary: Colors.white,
                  onSurface: Colors.black87,
                ),
              ),
              child: CalendarDatePicker(
                initialDate: isSelectingStart 
                    ? (startDate ?? DateTime.now()) 
                    : (endDate ?? startDate ?? DateTime.now()),
                firstDate: DateTime(2000),
                lastDate: DateTime(2100),
                currentDate: DateTime.now(),
                onDateChanged: (date) {
                  setState(() {
                    if (isSelectingStart) {
                      startDate = date;
                      if (endDate != null && endDate!.isBefore(startDate!)) {
                        endDate = startDate; // Shift end date if it's before start
                      }
                      isSelectingStart = false; // Transition to end date selection
                    } else {
                      if (startDate != null && date.isBefore(startDate!)) {
                        startDate = date; // User selected earlier date than start date
                      }
                      endDate = date;
                    }
                  });
                },
              ),
            ),
          ),
          const SizedBox(height: 16),

          ElevatedButton(
            onPressed: () {
              Navigator.pop(context, {'start': startDate, 'end': endDate});
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue.shade600,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            child: const Text('Apply', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

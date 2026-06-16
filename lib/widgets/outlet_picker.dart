import 'package:flutter/material.dart';

/// iOS-safe outlet selector.
///
/// Flutter's [DropdownButton] uses an overlay/Navigator route whose touch
/// events are swallowed on iOS Safari PWA (standalone mode).  This widget
/// replaces the dropdown with a [GestureDetector] + [showModalBottomSheet]
/// which works correctly on every platform.
class OutletPickerField extends StatelessWidget {
  final List<dynamic> outlets;
  final int? selectedOutletId;
  final ValueChanged<int?> onChanged;

  const OutletPickerField({
    super.key,
    required this.outlets,
    required this.selectedOutletId,
    required this.onChanged,
  });

  String get _selectedName {
    if (selectedOutletId == null) return 'Select Outlet';
    final match = outlets.where((o) {
      final id = o['id'] is int ? o['id'] : int.tryParse(o['id'].toString());
      return id == selectedOutletId;
    });
    return match.isNotEmpty ? (match.first['name'] ?? 'Unknown Outlet') : 'Select Outlet';
  }

  Future<void> _showPicker(BuildContext context) async {
    final selected = await showModalBottomSheet<int>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => _OutletPickerSheet(
        outlets: outlets,
        selectedOutletId: selectedOutletId,
      ),
    );
    if (selected != null) {
      onChanged(selected);
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _showPicker(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.black26),
          borderRadius: BorderRadius.circular(12),
          color: Colors.white,
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                _selectedName,
                style: const TextStyle(
                  color: Colors.black,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const Icon(Icons.keyboard_arrow_down, color: Colors.black),
          ],
        ),
      ),
    );
  }
}

class _OutletPickerSheet extends StatelessWidget {
  final List<dynamic> outlets;
  final int? selectedOutletId;

  const _OutletPickerSheet({
    required this.outlets,
    required this.selectedOutletId,
  });

  @override
  Widget build(BuildContext context) {
    final bottomPad = MediaQuery.of(context).padding.bottom;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12, bottom: 4),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.black12,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Text(
              'Select Outlet',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
            ),
          ),
          const Divider(height: 1),
          ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.5,
            ),
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: outlets.length,
              itemBuilder: (ctx, i) {
                final outlet = outlets[i];
                final id = outlet['id'] is int
                    ? outlet['id'] as int
                    : int.tryParse(outlet['id'].toString());
                final name = outlet['name'] ?? 'Unknown Outlet';
                final isSelected = id == selectedOutletId;

                return InkWell(
                  onTap: () => Navigator.pop(context, id),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 16,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? Colors.black.withOpacity(0.05)
                          : Colors.transparent,
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            name,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: isSelected
                                  ? FontWeight.w700
                                  : FontWeight.w500,
                              color: Colors.black,
                            ),
                          ),
                        ),
                        if (isSelected)
                          const Icon(Icons.check, size: 20, color: Colors.black),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          SizedBox(height: bottomPad + 8),
        ],
      ),
    );
  }
}

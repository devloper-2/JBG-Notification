import sys

with open("D:/JBG/JBG-Notification/lib/home_page.dart", "r", encoding="utf-8") as f:
    content = f.read()

start = content.find("  void _showFilterModal() {")
end = content.find("  @override\n  Widget build(BuildContext context) {")
if end == -1:
    end = content.find("  @override\r\n  Widget build(BuildContext context) {")

new_str = """  void _showFilterModal() async {
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

"""

if start != -1 and end != -1:
    with open("D:/JBG/JBG-Notification/lib/home_page.dart", "w", encoding="utf-8") as f:
        f.write(content[:start] + new_str + content[end:])
    print("Replaced")
else:
    print("Not found", start, end)

const fs = require('fs');

const path = "D:/JBG/JBG-Notification/lib/home_page.dart";
let content = fs.readFileSync(path, "utf-8");

let start = content.indexOf("  void _showFilterModal() {");
let end = content.indexOf("  @override\n  Widget build(BuildContext context) {");
if (end === -1) {
    end = content.indexOf("  @override\r\n  Widget build(BuildContext context) {");
}

const newStr = `  void _showFilterModal() async {
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

`;

if (start !== -1 && end !== -1) {
    content = content.substring(0, start) + newStr + content.substring(end);
    fs.writeFileSync(path, content, "utf-8");
    console.log("Replaced");
} else {
    console.log("Not found", start, end);
}

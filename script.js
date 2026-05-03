const fs = require('fs');
const filePath = 'D:/JBG/JBG-Notification/lib/home_page.dart';
let content = fs.readFileSync(filePath, 'utf8');

const newMethod = \  void _showFilterModal() async {
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
  }\;

const startIdx = content.indexOf('  void _showFilterModal() {');
const endIdx = content.indexOf('  @override\\n  Widget build(BuildContext context) {', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    content = content.substring(0, startIdx) + newMethod + '\n\n' + content.substring(endIdx);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Replaced successfully');
} else {
    console.log('Indices not found: ', startIdx, endIdx);
}

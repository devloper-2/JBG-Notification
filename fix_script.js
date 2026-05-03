const fs = require('fs');

const path = "D:/JBG/JBG-Notification/lib/home_page.dart";
let content = fs.readFileSync(path, "utf-8");

// Part A: from start up to "  void _showFilterModal() async {"
let idxAsync = content.indexOf("  void _showFilterModal() async {");
let partA = content.substring(0, idxAsync);

// Part B: the new async method
// We can find where Part C starts (the duplicated Scaffold build)
let idxScaffoldBuild = content.indexOf("  @override\n  Widget build(BuildContext context) {\n    return Scaffold(", idxAsync);
if (idxScaffoldBuild === -1) {
    idxScaffoldBuild = content.indexOf("  @override\r\n  Widget build(BuildContext context) {\r\n    return Scaffold(", idxAsync);
}
let partB = content.substring(idxAsync, idxScaffoldBuild);

// Part C: the duplicated middle part
// We want to skip it completely. We look for the true build method inside Part C.
// The true build method comes AFTER the OLD "void _showFilterModal() {" inside Part C.
let idxOldModal = content.indexOf("  void _showFilterModal() {", idxScaffoldBuild);
let idxColumnBuild = content.indexOf("  @override\n  Widget build(BuildContext context) {\n    return Column(", idxOldModal);
if (idxColumnBuild === -1) {
    idxColumnBuild = content.indexOf("  @override\r\n  Widget build(BuildContext context) {\r\n    return Column(", idxOldModal);
}

let partD = content.substring(idxColumnBuild);

if (idxAsync !== -1 && idxScaffoldBuild !== -1 && idxOldModal !== -1 && idxColumnBuild !== -1) {
    fs.writeFileSync(path, partA + partB + partD, "utf-8");
    console.log("Fixed!");
} else {
    console.log("Failed to find indices:", idxAsync, idxScaffoldBuild, idxOldModal, idxColumnBuild);
}

import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Top-level function so it can be used with compute() for background JSON parsing.
Map<String, dynamic> _parseJson(String body) {
  return jsonDecode(body) as Map<String, dynamic>;
}

class ApiService {
  static const String baseUrl = 'https://api.jbggola.com/api';

  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('accessToken');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  /// Get list of outlets for Admin
  Future<List<dynamic>> getOutlets() async {
    final headers = await _getHeaders();
    final uri = Uri.parse('$baseUrl/get-customer-user');
    final response = await http.get(uri, headers: headers).timeout(const Duration(seconds: 15));

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data is List) {
        return data;
      }
      return [];
    } else {
      throw Exception('Failed to load outlets: ${response.statusCode}');
    }
  }

  /// Get orders for Admin based on outlet
  Future<Map<String, dynamic>> getOrdersByOutlet(int customerId, {
    String? startDate,
    String? endDate,
    String? orderType,
    String? paymentMethod,
    String? status,
  }) async {
    final headers = await _getHeaders();
    
    // Build query parameters
    final Map<String, String> queryParams = {};
    if (startDate != null && startDate.isNotEmpty) queryParams['startDate'] = startDate;
    if (endDate != null && endDate.isNotEmpty) queryParams['endDate'] = endDate;
    if (orderType != null && orderType.isNotEmpty && orderType != 'all') queryParams['orderType'] = orderType;
    if (paymentMethod != null && paymentMethod.isNotEmpty && paymentMethod != 'all') queryParams['paymentMethod'] = paymentMethod;
    if (status != null && status.isNotEmpty && status != 'all') queryParams['status'] = status;

    final uri = Uri.parse('$baseUrl/find-orders/$customerId').replace(queryParameters: queryParams);
    
    final response = await http.get(uri, headers: headers).timeout(const Duration(seconds: 15));

    if (response.statusCode == 200) {
      // Parse in background isolate to avoid freezing UI on large responses
      return await compute(_parseJson, response.body);
    } else {
      throw Exception('Failed to load admin orders: ${response.statusCode}');
    }
  }

  /// Get orders for Outlet user
  Future<Map<String, dynamic>> getOrders(int customerId, {
    int page = 1,
    int perPage = 20,
    String? startDate,
    String? endDate,
    String? orderType,
    String? paymentMethod,
    String? status,
  }) async {
    final headers = await _getHeaders();
    
    final Map<String, String> queryParams = {
      'page': page.toString(),
      'per_page': perPage.toString(),
      'sort_by': 'order_datetime',
      'sort_order': 'DESC',
    };
    
    if (startDate != null && startDate.isNotEmpty) queryParams['startDate'] = startDate;
    if (endDate != null && endDate.isNotEmpty) queryParams['endDate'] = endDate;
    if (orderType != null && orderType.isNotEmpty && orderType != 'all') queryParams['orderType'] = orderType;
    if (paymentMethod != null && paymentMethod.isNotEmpty && paymentMethod != 'all') queryParams['paymentMethod'] = paymentMethod;
    if (status != null && status.isNotEmpty && status != 'all') queryParams['status'] = status;

    final uri = Uri.parse('$baseUrl/orders/$customerId/all').replace(queryParameters: queryParams);
    
    final response = await http.get(uri, headers: headers).timeout(const Duration(seconds: 15));

    if (response.statusCode == 200) {
      // Typically { success: boolean, data: any[], pagination: ..., aggregates: ... }
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load outlet orders: ${response.statusCode}');
    }
  }

  /// Get Day End (Daily Balance Sheet) Data
  Future<Map<String, dynamic>> getDailyBalanceSheet(int customerId, {
    String? startDate,
    String? endDate,
  }) async {
    final headers = await _getHeaders();
    final Map<String, String> queryParams = {};
    if (startDate != null && startDate.isNotEmpty) queryParams['start_date'] = startDate;
    if (endDate != null && endDate.isNotEmpty) queryParams['end_date'] = endDate;

    final uri = Uri.parse('$baseUrl/daily-balance-sheet/$customerId').replace(queryParameters: queryParams);
    final response = await http.get(uri, headers: headers).timeout(const Duration(seconds: 15));

    if (response.statusCode == 200) {
      return await compute(_parseJson, response.body);
    } else {
      throw Exception('Failed to load balance sheet: ${response.statusCode}');
    }
  }

  /// Get current active day session for outlet
  Future<Map<String, dynamic>?> getCurrentActiveDay(int customerId) async {
    try {
      final headers = await _getHeaders();
      final uri = Uri.parse('$baseUrl/day/current/$customerId');
      final response = await http.get(uri, headers: headers).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is Map<String, dynamic> && data['success'] == true) {
          return data;
        }
      }
      return null;
    } catch (e) {
      debugPrint('Error getting current active day: $e');
      return null;
    }
  }

  /// Get Settlement Total Edit setting for an outlet
  Future<Map<String, dynamic>> getSettlementSetting(int customerId) async {
    final headers = await _getHeaders();
    final uri = Uri.parse('$baseUrl/settlement-setting/$customerId');
    final response = await http.get(uri, headers: headers).timeout(const Duration(seconds: 15));

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load settlement setting: ${response.statusCode}');
    }
  }

  /// Update Settlement Total Edit setting for an outlet
  Future<bool> updateSettlementSetting(int customerId, bool allowTotalEdit) async {
    final headers = await _getHeaders();
    final uri = Uri.parse('$baseUrl/settlement-setting/$customerId');
    final response = await http.put(
      uri,
      headers: headers,
      body: jsonEncode({'allow_settlement_total_edit': allowTotalEdit}),
    ).timeout(const Duration(seconds: 15));

    if (response.statusCode == 200) {
      return true;
    } else {
      throw Exception('Failed to update settlement setting: ${response.statusCode}');
    }
  }

  /// Update Settlement Total Edit setting for ALL outlets
  Future<bool> updateAllSettlementSettings(bool allowTotalEdit) async {
    final headers = await _getHeaders();
    final uri = Uri.parse('$baseUrl/settlement-setting/all');
    final response = await http.put(
      uri,
      headers: headers,
      body: jsonEncode({'allow_settlement_total_edit': allowTotalEdit}),
    ).timeout(const Duration(seconds: 15));

    if (response.statusCode == 200) {
      return true;
    } else {
      throw Exception('Failed to update settlement settings for all outlets: ${response.statusCode}');
    }
  }

  /// Settle order (Admin permission enabled - unrestricted total editing)
  Future<Map<String, dynamic>> settleOrder({
    required int orderId,
    required double total,
    required String paymentMethod,
    double? cashAmount,
    double? cardAmount,
  }) async {
    final headers = await _getHeaders();
    final uri = Uri.parse('$baseUrl/update-order-total');

    final Map<String, dynamic> body = {
      'order_id': orderId,
      'total': total,
      'payment_method': paymentMethod,
      'is_admin': true,
    };

    if (paymentMethod == 'cash_card' && cashAmount != null && cardAmount != null) {
      body['cash_amount'] = cashAmount;
      body['card_amount'] = cardAmount;
    }

    final response = await http.put(
      uri,
      headers: headers,
      body: jsonEncode(body),
    ).timeout(const Duration(seconds: 15));

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      return data;
    } else {
      final msg = data['message'] ?? data['error'] ?? 'Failed to settle order (${response.statusCode})';
      throw Exception(msg);
    }
  }

  /// Get expenses for an outlet (Admin view)
  Future<Map<String, dynamic>> getAdminExpenses(int outletId, {
    String? startDate,
    String? endDate,
    int page = 1,
    int limit = 100,
  }) async {
    final headers = await _getHeaders();
    final Map<String, String> queryParams = {
      'page': page.toString(),
      'limit': limit.toString(),
    };
    if (startDate != null && startDate.isNotEmpty) queryParams['startDate'] = startDate;
    if (endDate != null && endDate.isNotEmpty) queryParams['endDate'] = endDate;

    final uri = Uri.parse('$baseUrl/admin/expenses/$outletId').replace(queryParameters: queryParams);
    final response = await http.get(uri, headers: headers).timeout(const Duration(seconds: 15));

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      // Fallback to /get-expenses/:customerId if needed
      final fallbackUri = Uri.parse('$baseUrl/get-expenses/$outletId').replace(queryParameters: queryParams);
      final fallbackResp = await http.get(fallbackUri, headers: headers).timeout(const Duration(seconds: 15));
      if (fallbackResp.statusCode == 200) {
        return jsonDecode(fallbackResp.body);
      }
      throw Exception('Failed to load expenses: ${response.statusCode}');
    }
  }

  /// Get expense categories for an outlet
  Future<List<dynamic>> getExpenseCategories(int outletId) async {
    final headers = await _getHeaders();
    final uri = Uri.parse('$baseUrl/admin/expenses/$outletId/categories');
    final response = await http.get(uri, headers: headers).timeout(const Duration(seconds: 15));

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data['data'] is List) {
        return data['data'];
      }
      return [];
    } else {
      // Fallback to /get-expense-categories/:customerId
      final fallbackUri = Uri.parse('$baseUrl/get-expense-categories/$outletId');
      final fallbackResp = await http.get(fallbackUri, headers: headers).timeout(const Duration(seconds: 15));
      if (fallbackResp.statusCode == 200) {
        final data = jsonDecode(fallbackResp.body);
        if (data['data'] is List) {
          return data['data'];
        }
      }
      return [];
    }
  }

  /// Add a new expense
  Future<Map<String, dynamic>> addExpense({
    required int outletId,
    required String description,
    required double amount,
    int? categoryId,
  }) async {
    final headers = await _getHeaders();
    final uri = Uri.parse('$baseUrl/admin/expenses/$outletId');
    final body = {
      'description': description,
      'amount': amount,
      if (categoryId != null) 'category_id': categoryId,
    };

    final response = await http.post(
      uri,
      headers: headers,
      body: jsonEncode(body),
    ).timeout(const Duration(seconds: 15));

    final data = jsonDecode(response.body);
    if (response.statusCode == 201 || (response.statusCode == 200 && data['success'] == true)) {
      return data;
    } else {
      final msg = data['message'] ?? 'Failed to add expense (${response.statusCode})';
      throw Exception(msg);
    }
  }

  /// Update an existing expense
  Future<Map<String, dynamic>> updateExpense({
    required int outletId,
    required int expenseId,
    required String description,
    required double amount,
    int? categoryId,
  }) async {
    final headers = await _getHeaders();
    final uri = Uri.parse('$baseUrl/admin/expenses/$outletId/$expenseId');
    final body = {
      'description': description,
      'amount': amount,
      if (categoryId != null) 'category_id': categoryId,
    };

    final response = await http.put(
      uri,
      headers: headers,
      body: jsonEncode(body),
    ).timeout(const Duration(seconds: 15));

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      return data;
    } else {
      final msg = data['message'] ?? 'Failed to update expense (${response.statusCode})';
      throw Exception(msg);
    }
  }

  /// Delete an expense
  Future<bool> deleteExpense({
    required int outletId,
    required int expenseId,
  }) async {
    final headers = await _getHeaders();
    final uri = Uri.parse('$baseUrl/admin/expenses/$outletId/$expenseId');

    final response = await http.delete(uri, headers: headers).timeout(const Duration(seconds: 15));

    if (response.statusCode == 200) {
      return true;
    } else {
      final data = jsonDecode(response.body);
      final msg = data['message'] ?? 'Failed to delete expense (${response.statusCode})';
      throw Exception(msg);
    }
  }
}

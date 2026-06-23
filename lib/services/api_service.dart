import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Top-level function so it can be used with compute() for background JSON parsing.
Map<String, dynamic> _parseJson(String body) {
  return jsonDecode(body) as Map<String, dynamic>;
}

class ApiService {
  // static const String baseUrl = 'http://192.168.1.6:8765/api';
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
}

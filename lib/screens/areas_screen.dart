import 'package:flutter/material.dart';

class AreasScreen extends StatelessWidget {
  const AreasScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Traffic Areas"),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(15),
        children: [
          areaCard("Anna Nagar", "Heavy Traffic", Colors.red),
          areaCard("T Nagar", "Medium Traffic", Colors.orange),
          areaCard("Airport Road", "Low Traffic", Colors.green),
          areaCard("Central Bus Stand", "Heavy Traffic", Colors.red),
          areaCard("City Center", "Medium Traffic", Colors.orange),
          areaCard("Railway Station", "Low Traffic", Colors.green),
          areaCard("IT Park", "Heavy Traffic", Colors.red),
          areaCard("Outer Ring Road", "Low Traffic", Colors.green),
        ],
      ),
    );
  }

  Widget areaCard(String area, String status, Color color) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Icon(Icons.location_on, color: color),
        title: Text(
          area,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(status),
        trailing: const Icon(Icons.arrow_forward_ios),
      ),
    );
  }
}
import 'package:flutter/material.dart';

import 'traffic_screen.dart';
import 'prediction_screen.dart';
import 'reports_screen.dart';
import 'areas_screen.dart';
import 'profile_screen.dart';
import 'settings_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("SmartCity AI"),
        centerTitle: true,
        backgroundColor: Colors.blue,
      ),
      body: Padding(
        padding: const EdgeInsets.all(15),
        child: GridView.count(
          crossAxisCount: 2,
          crossAxisSpacing: 15,
          mainAxisSpacing: 15,
          children: [

            dashboardCard(
              context,
              Icons.traffic,
              "Traffic Analytics",
              Colors.orange,
              const TrafficScreen(),
            ),

            dashboardCard(
              context,
              Icons.analytics,
              "AI Prediction",
              Colors.green,
              const PredictionScreen(),
            ),

            dashboardCard(
              context,
              Icons.bar_chart,
              "Reports",
              Colors.purple,
              const ReportsScreen(),
            ),

            dashboardCard(
              context,
              Icons.location_city,
              "Traffic Areas",
              Colors.blue,
              const AreasScreen(),
            ),

            dashboardCard(
              context,
              Icons.person,
              "Profile",
              Colors.teal,
              const ProfileScreen(),
            ),

            dashboardCard(
              context,
              Icons.settings,
              "Settings",
              Colors.red,
              const SettingsScreen(),
            ),
          ],
        ),
      ),
    );
  }

  Widget dashboardCard(
    BuildContext context,
    IconData icon,
    String title,
    Color color,
    Widget screen,
  ) {
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => screen,
          ),
        );
      },
      child: Card(
        elevation: 5,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [

            CircleAvatar(
              radius: 35,
              backgroundColor: color.withOpacity(0.2),
              child: Icon(
                icon,
                size: 40,
                color: color,
              ),
            ),

            const SizedBox(height: 15),

            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),

          ],
        ),
      ),
    );
  }
}
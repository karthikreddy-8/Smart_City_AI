import 'package:flutter/material.dart';

class ReportsScreen extends StatelessWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Traffic Reports"),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(15),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [

            const Text(
              "Reports Dashboard",
              style: TextStyle(
                fontSize: 25,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 20),

            Row(
              children: [

                Expanded(
                  child: reportCard(
                    "Today",
                    "25",
                    Colors.blue,
                  ),
                ),

                const SizedBox(width: 10),

                Expanded(
                  child: reportCard(
                    "Weekly",
                    "150",
                    Colors.green,
                  ),
                ),

              ],
            ),

            const SizedBox(height: 10),

            Row(
              children: [

                Expanded(
                  child: reportCard(
                    "Monthly",
                    "620",
                    Colors.orange,
                  ),
                ),

                const SizedBox(width: 10),

                Expanded(
                  child: reportCard(
                    "Total",
                    "2150",
                    Colors.red,
                  ),
                ),

              ],
            ),

            const SizedBox(height: 25),

            const Text(
              "Recent Reports",
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 15),

            reportTile(
              "Anna Nagar",
              "Heavy Traffic",
              "10:30 AM",
            ),

            reportTile(
              "T Nagar",
              "Medium Traffic",
              "11:15 AM",
            ),

            reportTile(
              "Airport Road",
              "Low Traffic",
              "12:00 PM",
            ),

            reportTile(
              "City Center",
              "Heavy Traffic",
              "01:20 PM",
            ),

          ],
        ),
      ),
    );
  }

  Widget reportCard(
      String title,
      String value,
      Color color,
      ) {
    return Card(
      elevation: 5,
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          children: [

            Text(
              value,
              style: TextStyle(
                fontSize: 28,
                color: color,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 10),

            Text(title)

          ],
        ),
      ),
    );
  }

  Widget reportTile(
      String area,
      String status,
      String time,
      ) {
    return Card(
      child: ListTile(
        leading: const Icon(Icons.description),
        title: Text(area),
        subtitle: Text(status),
        trailing: Text(time),
      ),
    );
  }
}
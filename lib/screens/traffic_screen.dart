import 'package:flutter/material.dart';

class TrafficScreen extends StatelessWidget {
  const TrafficScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Traffic Analytics"),
        centerTitle: true,
      ),

      body: SingleChildScrollView(
        padding: const EdgeInsets.all(15),

        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,

          children: [

            TextField(
              decoration: InputDecoration(
                hintText: "Search Area",
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),

            const SizedBox(height:20),

            Row(
              children: [

                Expanded(
                  child: trafficCard(
                    "Heavy",
                    "12",
                    Colors.red,
                  ),
                ),

                const SizedBox(width:10),

                Expanded(
                  child: trafficCard(
                    "Medium",
                    "18",
                    Colors.orange,
                  ),
                ),

                const SizedBox(width:10),

                Expanded(
                  child: trafficCard(
                    "Low",
                    "25",
                    Colors.green,
                  ),
                ),

              ],
            ),

            const SizedBox(height:25),

            const Text(
              "Traffic Areas",
              style: TextStyle(
                fontSize:22,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height:15),

            trafficTile(
              "Anna Nagar",
              "Heavy Traffic",
              Colors.red,
            ),

            trafficTile(
              "T Nagar",
              "Medium Traffic",
              Colors.orange,
            ),

            trafficTile(
              "Airport Road",
              "Low Traffic",
              Colors.green,
            ),

            trafficTile(
              "Central Bus Stand",
              "Heavy Traffic",
              Colors.red,
            ),

            trafficTile(
              "City Center",
              "Medium Traffic",
              Colors.orange,
            ),
          ],
        ),
      ),
    );
  }

  Widget trafficCard(String title, String value, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(15),
        child: Column(
          children: [

            Text(
              value,
              style: TextStyle(
                fontSize:28,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),

            const SizedBox(height:8),

            Text(title)

          ],
        ),
      ),
    );
  }

  Widget trafficTile(
      String area,
      String status,
      Color color,
      ) {
    return Card(
      child: ListTile(
        leading: Icon(
          Icons.location_on,
          color: color,
        ),
        title: Text(area),
        subtitle: Text(status),
        trailing: const Icon(Icons.arrow_forward_ios),
      ),
    );
  }
}
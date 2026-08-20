import 'package:flutter/material.dart';

class PredictionScreen extends StatelessWidget {
  const PredictionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("AI Traffic Prediction"),
        centerTitle: true,
      ),

      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),

        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,

          children: [

            const Text(
              "Predict Traffic",
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height:20),

            TextField(
              decoration: InputDecoration(
                labelText: "Area Name",
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.location_city),
              ),
            ),

            const SizedBox(height:20),

            TextField(
              decoration: InputDecoration(
                labelText: "Vehicle Count",
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.directions_car),
              ),
              keyboardType: TextInputType.number,
            ),

            const SizedBox(height:20),

            TextField(
              decoration: InputDecoration(
                labelText: "Average Speed (km/h)",
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.speed),
              ),
              keyboardType: TextInputType.number,
            ),

            const SizedBox(height:30),

            SizedBox(
              width: double.infinity,
              height: 55,
              child: ElevatedButton(
                onPressed: () {},
                child: const Text(
                  "Predict Traffic",
                  style: TextStyle(fontSize:18),
                ),
              ),
            ),

            const SizedBox(height:40),

            Card(
              elevation: 5,
              child: Padding(
                padding: EdgeInsets.all(20),
                child: Column(
                  children: [

                    Text(
                      "Prediction Result",
                      style: TextStyle(
                        fontSize:20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),

                    SizedBox(height:20),

                    Text(
                      "No Prediction Yet",
                      style: TextStyle(
                        fontSize:18,
                        color: Colors.grey,
                      ),
                    ),

                  ],
                ),
              ),
            )

          ],
        ),
      ),
    );
  }
}
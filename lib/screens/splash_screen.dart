import 'dart:async';
import 'package:flutter/material.dart';
import 'login_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {

  @override
  void initState() {
    super.initState();

    Timer(const Duration(seconds: 3), () {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => const LoginScreen(),
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.blue,
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [

            Icon(
              Icons.location_city,
              color: Colors.white,
              size: 100,
            ),

            SizedBox(height:20),

            Text(
              "SmartCity AI",
              style: TextStyle(
                color: Colors.white,
                fontSize:30,
                fontWeight: FontWeight.bold,
              ),
            ),

            SizedBox(height:10),

            Text(
              "Urban Traffic Congestion Analytics",
              style: TextStyle(
                color: Colors.white70,
                fontSize:18,
              ),
            ),

          ],
        ),
      ),
    );
  }
}
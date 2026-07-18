import pandas as pd
import numpy as np

class DataCleaner:
    @staticmethod
    def clean_dataset(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
        stats = {
            "initial_rows": len(df),
            "duplicates_removed": 0,
            "missing_values_imputed": 0,
            "outliers_handled": 0,
            "invalid_coords_handled": 0,
            "final_rows": 0
        }
        
        # 1. Handle Duplicates
        initial_len = len(df)
        df = df.drop_duplicates()
        stats["duplicates_removed"] = initial_len - len(df)
        
        # 2. Handle invalid coordinates
        invalid_coords = (
            (df['Latitude'] < -90) | (df['Latitude'] > 90) |
            (df['Longitude'] < -180) | (df['Longitude'] > 180) |
            df['Latitude'].isna() | df['Longitude'].isna()
        )
        stats["invalid_coords_handled"] = int(invalid_coords.sum())
        
        # Clean coordinates by replacing with default city coords (e.g. Delhi NCR center 28.6139, 77.2090) if invalid
        df.loc[invalid_coords, 'Latitude'] = 28.6139
        df.loc[invalid_coords, 'Longitude'] = 77.2090
        
        # 3. Missing Value Imputation
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        categorical_cols = df.select_dtypes(exclude=[np.number]).columns
        
        missing_count_before = df.isna().sum().sum()
        
        for col in numeric_cols:
            if df[col].isna().any():
                df[col] = df[col].fillna(df[col].median())
                
        for col in categorical_cols:
            if df[col].isna().any():
                df[col] = df[col].fillna(df[col].mode().iloc[0] if not df[col].mode().empty else "Clear")
                
        stats["missing_values_imputed"] = int(missing_count_before - df.isna().sum().sum())
        
        # 4. Outlier detection & correction (IQR method)
        # We correct outliers in Vehicle Count & Average Speed by capping them to the 1.5 * IQR boundaries
        outliers_count = 0
        for col in ["Vehicle Count", "Average Speed"]:
            if col in df.columns:
                # Ensure no invalid negative numbers before calculating IQR
                if col == "Average Speed":
                    negative_speeds = df[col] < 0
                    df.loc[negative_speeds, col] = df[col].median()
                    outliers_count += int(negative_speeds.sum())
                
                q1 = df[col].quantile(0.25)
                q3 = df[col].quantile(0.75)
                iqr = q3 - q1
                lower_bound = max(0, q1 - 1.5 * iqr)
                upper_bound = q3 + 1.5 * iqr
                
                outliers = (df[col] < lower_bound) | (df[col] > upper_bound)
                outliers_count += int(outliers.sum())
                
                # Cap values
                # Ensure the bound types match the column dtype to prevent pandas TypeError
                dtype = df[col].dtype.type
                df.loc[df[col] < lower_bound, col] = dtype(lower_bound)
                df.loc[df[col] > upper_bound, col] = dtype(upper_bound)
                
        stats["outliers_handled"] = outliers_count
        
        # 5. Type Conversions & Standardizations
        if "Date" in df.columns:
            df["Date"] = pd.to_datetime(df["Date"], errors='coerce').fillna(pd.Timestamp("today")).dt.strftime("%Y-%m-%d")
        if "Time" in df.columns:
            # Normalize to HH:MM format
            df["Time"] = df["Time"].astype(str).str.strip().str[:5]
            # Replace invalid times with default
            df.loc[~df["Time"].str.match(r'^\d{2}:\d{2}$'), "Time"] = "12:00"
            
        stats["final_rows"] = len(df)
        return df, stats

#-------------------------------------------------------------------------------
# Name:        uganda_temp_rainfall_ndvi_stats
# Purpose:      calculates the mean temp, rainfall and ndvi statistics for each admin region
#
# Author:      caleb
#
# Created:     10/02/2025
# Copyright:   (c) caleb 2025
# Licence:     <your licence>
#-------------------------------------------------------------------------------

import rasterio as rio
import geopandas as gpd

import pandas as pd
from rasterio.mask import mask
import numpy as np
import os

from rasterstats import zonal_stats


def calculate_stats(region:str,raster_data_folder:str,output_excel:str,sheetname:str):

    months=["January","February","March","April","May","June","July","August","September","October","November","December"]
    uganda_districts=[]
    zonal_stat=[]
    month_list=[]
    year_list=[]

    vector_gpd=gpd.read_file(region)
    raster_list=[x for x in os.listdir(raster_data_folder) if x.endswith(".tif")]
    for i in range(len(raster_list)):
        raster_dataset=os.path.join(raster_data_folder,raster_list[i])

        current_month=int(raster_list[i].split(".tif")[0].split("_")[1])
        current_year=int(raster_list[i].split(".tif")[0].split("_")[2])


        admin_mean=zonal_stats(region,raster_dataset)

        for j in range(len(vector_gpd)):

            uganda_districts.append(vector_gpd['region'][j])

            zonal_stat.append(admin_mean[j]['mean'])

            month_list.append(months[current_month-1]) # list starts from index 0 and not 1
            year_list.append(current_year)


    summary_stats=pd.DataFrame({"name":uganda_districts,"mean":zonal_stat,"month":month_list,"year":year_list})

    summary_stats.to_excel(output_excel,sheet_name=sheetname,index=False)

    return summary_stats


"""
vector_dataset=r"C:\Users\caleb\OneDrive\Desktop\private\projects\Makokha_FAO\UG_Admin_2020-CDI\UG_Admin_2020_CDI.geojson"

##ndvi_excel_file=r"C:\Users\caleb\OneDrive\Desktop\private\projects\Makokha_FAO\temp_rain_ndvi\summary_stats\ndvi.xlsx"
##ndvi_raster_folder=r"C:\Users\caleb\OneDrive\Desktop\private\projects\Makokha_FAO\temp_rain_ndvi\GEE_FAO_NDVI"
##ndvi_stats=calculate_stats(region=vector_dataset,raster_data_folder=ndvi_raster_folder,output_excel=ndvi_excel_file,sheetname='ndvi')


##scaled_ndvi_excel_file=r"C:\Users\caleb\OneDrive\Desktop\private\projects\Makokha_FAO\temp_rain_ndvi\summary_stats\scaled_ndvi.xlsx"
##scaled_ndvi_raster_folder=r"C:\Users\caleb\OneDrive\Desktop\private\projects\Makokha_FAO\temp_rain_ndvi\GEE_FAO_scaled_NDVI"
##scaled_ndvi_stats=calculate_stats(region=vector_dataset,raster_data_folder=scaled_ndvi_raster_folder,output_excel=scaled_ndvi_excel_file,sheetname='scaled_ndvi')


##temp_excel_file=r"C:\Users\caleb\OneDrive\Desktop\private\projects\Makokha_FAO\temp_rain_ndvi\summary_stats\temp.xlsx"
##temp_raster_folder=r"C:\Users\caleb\OneDrive\Desktop\private\projects\Makokha_FAO\temp_rain_ndvi\GEE_FAO_Temp"
##temp_stats=calculate_stats(region=vector_dataset,raster_data_folder=temp_raster_folder,output_excel=temp_excel_file,sheetname="temperature")

##
##precipitation_excel_file=r"C:\Users\caleb\OneDrive\Desktop\private\projects\Makokha_FAO\temp_rain_ndvi\summary_stats\rainfall.xlsx"
##precipitation_raster_folder=r"C:\Users\caleb\OneDrive\Desktop\private\projects\Makokha_FAO\temp_rain_ndvi\GEE_FAO_Precipitation"
##precipitation_stats=calculate_stats(region=vector_dataset,raster_data_folder=precipitation_raster_folder,output_excel=precipitation_excel_file,sheetname="precipitation")

"""

//load study area 

var regionAoi = ee.FeatureCollection(uganda_admin0);


Map.centerObject(regionAoi)
Map.addLayer(regionAoi, {},'admin AOI')


//calculate rainfall
function chirpsRainfall(startDay, endDay) {


    // aggregate CHIRPS daily precipitation dataset into a monthly value
    var rain = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
      .filter(ee.Filter.date(startDay, endDay))
      .select('precipitation')
      .reduce(ee.Reducer.sum())
      .clip(regionAoi);
      
      print(rain)
      
    //rainfall classes estimates
     // 0-10
      //10-20
      //20-30
      //30-40
      //40-50
      //50-75
      //75-100
      //100-150
      //150-200
      //200-250
      //greater than 250
    var reclassifiedRain=rain.where(rain.gt(0).and(rain.lte(10)),1) //class 1
                              .where(rain.gt(10).and(rain.lte(20)),2) //class 2
                              .where(rain.gt(20).and(rain.lte(30)),3) //class 3
                              .where(rain.gt(30).and(rain.lte(40)),4) //class 4
                              .where(rain.gt(40).and(rain.lte(50)),5) //class 5                              
                              .where(rain.gt(50).and(rain.lte(75)),6) //class 6                              
                              .where(rain.gt(75).and(rain.lte(100)),7) //class 7                              
                              .where(rain.gt(100).and(rain.lte(150)),8) //class 8                             
                              .where(rain.gt(150).and(rain.lte(200)),9) //class 9                             
                              .where(rain.gt(200).and(rain.lte(250)),10) //class 10                              
                              .where(rain.gt(250),11) //class 11                              
                              
    return rain,reclassifiedRain;

}

// calculate NDVI
function modisNDVI(startDay, endDay) {
  
    // get Modis NDVI mothly dataset
    var ndvi = ee.ImageCollection('MODIS/061/MOD13A2')
      .filter(ee.Filter.date(startDay, endDay))
      .select('NDVI')
      .reduce(ee.Reducer.mean())
      .clip(regionAoi);
     

    return ndvi;

}



// calculate yearly statistics
function calculateStats(year, durationInYears, regionAoi) {
  var dictMonthYear = {
    Year: [],
    month: [],
    mean_monthly_NDVI: [],
    mean_monthly_rainfall: []
  };
  
  var startDay;
  var endDay;
  var regionAoi



  for (var i = 0; i < durationInYears; i++) {
    var currentYear = year + i;
    
    
    for (var k = 1; k <= 12; k++) {
      print(""+currentYear+"-"+ee.Number(k).format('%02d').getInfo())
      //console.log(`year ${currentYear}, month ${k}`);

      if (k === 2) {
        startDay = ""+currentYear+"-"+ee.Number(k).format('%02d').getInfo() + '-' + "01";
        endDay =""+currentYear+"-"+ee.Number(k).format('%02d').getInfo() + '-' + "28";
      } 
      else if (k===4|| k=== 6 ||k=== 9 ||k===11) {
        startDay = ""+currentYear+"-"+ee.Number(k).format('%02d').getInfo()+'-'+"01";
        endDay = ""+currentYear+"-"+ee.Number(k).format('%02d').getInfo()+'-'+"30";
        
      }
        
      else {
        startDay = ""+currentYear+"-"+ee.Number(k).format('%02d').getInfo()+'-'+"01";
         endDay =""+currentYear+"-"+ee.Number(k).format('%02d').getInfo()+'-'+"31";
      }
      
      // Call the satelliteModis function and calculate monthly rainfall
      var monthlyNDVI = modisNDVI(startDay, endDay)
      var monthlyRain, monthlyClassifiedRain = chirpsRainfall(startDay, endDay);


      // export rainfall_raster
      Export.image.toDrive({
      image:monthlyRain,
      description:"" + "rainfall"+"_"+ee.Number(k).format('%02d').getInfo()+"_"+currentYear,
      scale:5566,
      crs:'EPSG:4326',
      folder:'GEE_FAO_Precipitation',
      maxPixels:1e13,
      region:regionAoi
      });

      
      //export classified_rainfall raster
      
      Export.image.toDrive({
      image:monthlyClassifiedRain,
      description:"" + "classified_rainfall"+"_"+ee.Number(k).format('%02d').getInfo()+"_"+currentYear,
      scale:5566,
      crs:'EPSG:4326',
      folder:'GEE_FAO_Precipitation_classified',
      maxPixels:1e13,
      region:regionAoi
      });
      
      // export monthly NDVI anaomaly
      Export.image.toDrive({
      image:monthlyNDVI,
      description:"" + "ndvi"+"_"+ee.Number(k).format('%02d').getInfo()+"_"+currentYear,
      scale:5566,
      crs:'EPSG:4326',
      folder:'GEE_FAO_NDVI',
      maxPixels:1e13,
      region:regionAoi
      });
      

    }
  }

 
}


var monthlyRainfallNDVI=calculateStats(2001,24,regionAoi)  







var aoi = ee.FeatureCollection("projects/boscondeka/assets/UG_CDI/UG_Admin_0");


/*This is a script for implementing the Temperature drought Index - TDI - using the MODIS LST data

To understand the TDI, kindly read its documentation here - https://cdi.faoswalim.org/uploads/CDI-Manual.pdf

We load the CHIRPS data and extract its projection and resolution. We would like PDI and TDI to be 
of the same spatial resolution (5566km)*/

//centering the map to the area of interest

Map.centerObject(aoi, 6)

// Load the CHIRPS ImageCollection. From it we will get the projection and spatial resolution
var CHIRPS= ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD')
            .filterBounds(aoi);

var precipitation = CHIRPS.select('precipitation').first();

// Get information about the chirps projection.
var chirpsProjection = precipitation.projection();

//loading the MODIS LST data. Remember its spatial resolution is 1km

var dataset = ee.ImageCollection('MODIS/061/MOD11A1')
                  .filterBounds(aoi);
                  
//selecting the band with the LST values
                  
var landSurfaceTemperature = dataset.select('LST_Day_1km');

//converting the temperature to read in degrees celcius (from Kelvins)

var modLSTc = landSurfaceTemperature.map(function(img) {
  return img
    .multiply(0.02)
    .subtract(273.15)
    .copyProperties(img, ['system:time_start']);
});

// Define constants and dynamic parameters. TDI base year and month is 2001, January

var startYear = 2001; // Start year remains constant
var startMonth = 1;   // Start month remains constant
var endYear = 2024;   // Adjust this to the year you want its TDI
var endMonth = 11;    // Adjust this to the month you want its TDI

/*Initialize an object to store all temperature data globally. By global i mean it will store variables that we will
be able to access later in the script.*/ 

var temperatureData = {};

// Function to generate and store monthly temperature means in the dictionary
function storeTemperatureVariable(year, month) {
  var startDate = ee.Date.fromYMD(year, month, 1);
  var endDate = startDate.advance(1, 'month');
  var monthStr = month < 10 ? '0' + month : month; // Ensure month has leading zero
  var variableName = 't_' + year + '_' + monthStr; // Example: T_2024_06
  
  // Compute monthly temperature sum and clip to the region
  var temperatureLayer = modLSTc.filterDate(startDate, endDate)
                                   .reduce(ee.Reducer.mean())
                                   .clip(aoi)
                                   .reproject({crs: chirpsProjection})
                                   .reduceResolution({reducer: ee.Reducer.mean()});
  
  // Store the temperatureLayer in the dictionary
  temperatureData[variableName] = temperatureLayer;
}

// Loop through all years and months, generating temperature variables
for (var year = startYear; year <= endYear; year++) {
  for (var month = 1; month <= (year === endYear ? endMonth : 12); month++) {
    storeTemperatureVariable(year, month);
  }
}

// Test: Access a layer from the dictionary and add it to the map
/*var testLayerName = 't_2011_06'; // Example: June 2024
var testLayer = temperatureData[testLayerName];

if (testLayer) {
  Map.centerObject(aoi);
  Map.addLayer(testLayer, { min: 0, max: 300, palette: ['blue', 'green', 'yellow', 'red'] }, 'June 2024 temperature');
} else {
  print('Error: Layer not found for', testLayerName);
}*/

//////////////////////////end of loading temperature monthly data ////////////////////////


//////////////////////////////////////T modified start////////////////////////////////////////

// Initialize a new object to store the modified temperature variables

var modifiedtemperatureData = {};


// Function to modify temperature data by minus 45.45 and  storing it with a new name

function modifyTemperatureVariable(year, month) {
  var monthStr = month < 10 ? '0' + month : month; // Ensure month has leading zero
  var originalVariableName = 't_' + year + '_' + monthStr; // Example: p_2024_06
  var modifiedVariableName = 't_mod_' + year + '_' + monthStr; // Example: p_mod_2024_06

  // Retrieve the original temperature and minus 45.45
  var originalLayer = temperatureData[originalVariableName];
  if (originalLayer) {
    var modifiedLayer = originalLayer.multiply(-1).add(45.45);
    modifiedtemperatureData[modifiedVariableName] = modifiedLayer; // Store in the dictionary
  } else {
    print('Warning: Original layer not found for', originalVariableName);
  }
}

// Loop through all years and months to modify temperature variables
for (var year = startYear; year <= endYear; year++) {
  for (var month = 1; month <= (year === endYear ? endMonth : 12); month++) {
    modifyTemperatureVariable(year, month);
  }
}

// Test: Access a modified layer and add it to the map
/*var testModifiedLayerName = 't_mod_2023_11'; // Example: June 2024
var testModifiedLayer = modifiedtemperatureData[testModifiedLayerName];

if (testModifiedLayer) {
  Map.centerObject(aoi);
  Map.addLayer(testModifiedLayer, { min: 1, max: 300, palette: ['blue', 'green', 'yellow', 'red'] }, 'Modified June 2024 temperature');
} else {
  print('Error: Modified layer not found for', testModifiedLayerName);
}*/


//////////////////////////////////////T modified end////////////////////////////////////////


/////////////////////////////////////Means begin///////////////////////////////////////

// getting the means for the months e.g mean of all januaries from 2001 to present 


// Shared object to store all monthly mean variables
var globalMonthlyMeans = {};

// Function to calculate and store the historical mean for a given month
function calculateAndAssignMonthlyMean(month) {
  var monthStr = month < 10 ? '0' + month : month; // Ensure month has leading zero
  var modifiedVariables = [];

  // Collect all modified variables for the specified month across all years
  for (var year = startYear; year <= endYear; year++) {
    var modifiedVariableName = 't_mod_' + year + '_' + monthStr; // Example: t_mod_2024_06
    if (modifiedtemperatureData[modifiedVariableName]) {
      modifiedVariables.push(modifiedtemperatureData[modifiedVariableName]);
    }
  }

  // Calculate the mean of the collected variables only if there are valid variables
  if (modifiedVariables.length > 0) {
    var monthName = ee.Date.fromYMD(2000, month, 1).format('MMMM').getInfo(); // Get month name
    var meanVariableName = 't_mod_' + monthName.toLowerCase() + '_mean'; // Example: t_mod_february_mean

    // Calculate the mean and store it in the shared object
    globalMonthlyMeans[meanVariableName] = ee.ImageCollection(modifiedVariables).mean();
  }
}

// Iterate through all months (1 to 12) to calculate and assign historical means
for (var month = 1; month <= 12; month++) {
  calculateAndAssignMonthlyMean(month);
}

// Test: Add the February mean layer to the map
/*if (globalMonthlyMeans['t_mod_november_mean']) {
  Map.centerObject(aoi);
  Map.addLayer(globalMonthlyMeans['t_mod_november_mean'], { min: 1, max: 300, palette: ['blue', 'green', 'yellow', 'red'] }, 'February Mean Precipitation');
}*/

//////////////////////////////////end of means //////////////////////////////////////////////////////


///////////////////////////////Begin average of interest period///////////////////////////////////

//getting average for interest period of 6 months before

// Variable to set the running average period (default is 6 months, could be changed to 3 or 12 depending on expert advice)

var runningAveragePeriod = 6;

// Object to store all running average variables
var runningAverageData = {};

// Function to calculate the running average for a given year and month
function calculateRunningAverage(year, month) {
  var monthStr = month < 10 ? '0' + month : month; // Ensure month has leading zero
  var currentKey = 't_mod_' + year + '_' + monthStr + '_runlgth_average'; // Example: t_mod_2024_06_runlgth_average
  var collection = [];

  // Collect the last `runningAveragePeriod` months
  for (var i = 0; i < runningAveragePeriod; i++) {
    var targetMonth = month - i;
    var targetYear = year;

    // Adjust year and month for boundary conditions
    if (targetMonth <= 0) {
      targetMonth += 12;
      targetYear -= 1;
    }

    var targetMonthStr = targetMonth < 10 ? '0' + targetMonth : targetMonth; // Ensure month has leading zero
    var targetKey = 't_mod_' + targetYear + '_' + targetMonthStr; // Example: t_mod_2023_11

    // Check if the target variable exists
    if (modifiedtemperatureData[targetKey]) {
      collection.push(modifiedtemperatureData[targetKey]);
    }
  }

  // Calculate and store the mean if there are valid inputs
  if (collection.length > 0) {
    runningAverageData[currentKey] = ee.ImageCollection(collection).mean();
  }
}

// Iterate over all years and months to calculate the running averages
for (var year = startYear; year <= endYear; year++) {
  for (var month = 1; month <= 12; month++) {
    calculateRunningAverage(year, month);
  }
}

// Test: Add a layer for a specific running average (e.g., October 2024) to the map
/*var testKey = 'p_mod_2024_10_runlgth_average';
if (runningAverageData[testKey]) {
  Map.centerObject(aoi);
  Map.addLayer(
    runningAverageData[testKey],
    { min: 1, max: 300, palette: ['blue', 'green', 'yellow', 'red'] },
    'October 2024 Running Average Precipitation'
  );
}*/




////////////////////end of getting average for interest period of 6 months before, including the current month/////////////



////// begin getting average for interest period of 6 months before but for the months e.g mean of all januaries///////////////


// Object to store the running-length means for all months
var runningLengthMeans = {};

// Mapping months to their names
var temperatureKey = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

// Function to pad numbers with leading zeros (e.g., 1 -> "01")
function padZero(number) {
  return number < 10 ? '0' + number : '' + number;
}

// Function to calculate running-length means for a specific month
function calculateMonthRunningMean(monthIndex) {
  var monthName = temperatureKey[monthIndex]; // Get the month name (e.g., january)
  var monthKey = 't_mod_' + monthName + '_runlgth_mean'; // Example: t_mod_january_runlgth_mean
  var collection = [];

  // Collect images for this month from all years
  for (var year = endYear; year >= startYear; year--) {
    var yearMonthKey = 't_mod_' + year + '_' + padZero(monthIndex + 1) + '_runlgth_average'; // Example: t_mod_2024_01_runlgth_average
    if (runningAverageData[yearMonthKey]) {
      collection.push(runningAverageData[yearMonthKey]);
    }
  }

  // Calculate and store the mean if there are valid inputs
  if (collection.length > 0) {
    runningLengthMeans[monthKey] = ee.ImageCollection(collection).mean();
  }
}

// Iterate over all months to calculate running-length means
for (var monthIndex = 0; monthIndex < 12; monthIndex++) {
  calculateMonthRunningMean(monthIndex);
}

// Test: Add a layer for a specific running-length mean (e.g., January)
/*var testMonthKey = 't_mod_april_runlgth_mean';
if (runningLengthMeans[testMonthKey]) {
  Map.centerObject(aoi);
  Map.addLayer(
    runningLengthMeans[testMonthKey],
    { min: 1, max: 80, palette: ['blue', 'cyan', 'green', 'yellow', 'orange', 'red', 'brown', 'white'] },
    'January Running-Length Mean Precipitation'
  );
}*/

////// end of getting average for interest period of 6 months before but for the months e.g mean of all januaries///////////////

////////////////////////////// reclassifying into 0's and 1st in order to compute the runlength
/////////////////////////// begin of Excess - where (T+1) is more than long term mean. The resultant images have either a 0 or 1 as their pixel value



// Define reclassification rules
var DTstring = [
  '1) root 9999 9999 9999',
  '2) LST_Day_1km_mean<0 9999 9999 0 *',
  '3) LST_Day_1km_mean>=0 9999 9999 1 *'
].join("\n");

var classifier = ee.Classifier.decisionTree(DTstring);

// Assume `modifiedtemperatureData` and `globalMonthlyMeans` are defined earlier in the script
// Example structure for these objects:
// var modifiedtemperatureData = { 't_mod_2001_01': ee.Image(...), ... };
// var globalMonthlyMeans = { 't_mod_january_mean': ee.Image(...), ... };

// Global object to store deficits
var deficitLayers = {};

// Function to calculate deficits for all years and months
var calculateDeficits = function () {
  for (var month = 1; month <= 12; month++) {
    var monthName = ee.Date.fromYMD(2000, month, 1).format('MMMM').getInfo().toLowerCase();
    var meanKey = 't_mod_' + monthName + '_mean';

    // Skip if mean does not exist
    var mean = globalMonthlyMeans[meanKey];
    if (!mean) continue;

    for (var year = startYear; year <= endYear; year++) {
      if (year === endYear && month > endMonth) break; // Skip months beyond available data

      var temperatureKey = 't_mod_' + year + '_' + (month < 10 ? '0' + month : month);
      var temperature = modifiedtemperatureData[temperatureKey];

      // Skip if temperature data is missing
      if (!temperature) continue;

      // Calculate deficit and reclassify
      var deficit = temperature.subtract(mean)
        .select('LST_Day_1km_mean')
        .classify(classifier);

      // Generate the key for the deficit layer
      var deficitKey = 'deficit_' + year + '_' + monthName;

      // Store the deficit layer in the global object
      deficitLayers[deficitKey] = deficit;
    }
  }
};

// Calculate all deficits and store them globally
calculateDeficits();

// Print the deficit layers for verification
//print('Deficit Layers:', deficitLayers);

// Example: Access a specific deficit layer
/*var deficit2024October = deficitLayers['deficit_2024_october'];
if (deficit2024October) {
  Map.addLayer(
    deficit2024October,
    { min: 0, max: 1, palette: ['blue', 'yellow', 'red'] },
    'Deficit 2024 October'
  );
} else {
  print('Deficit for 2024 October not available.');
}*/



// end of excess - where (t modified) is more than long term mean. The resultant images have either a 0 or 1 as their pixel value


//Grouping the images into a collection of 6 in order to compute the runlength

// Helper function to map month numbers to full names
function getMonthName(monthNumber) {
    var temperatureKey = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
    ];
    return temperatureKey[monthNumber - 1]; // Array is zero-based
}

// Helper function to calculate previous months
function getPreviousMonths(year, month, period) {
    var months = [];
    for (var i = 0; i < period; i++) {
        months.push({
            year: year,
            month: month
        });
        month--;
        if (month < 1) { // Handle year transition
            month = 12;
            year--;
        }
    }
    return months;
}

// Global object to store the grouped collections
var groupedCollections = {};

// Loop over the years and months
for (var year = startYear; year <= endYear; year++) {
    for (var month = 1; month <= 12; month++) {
        // Skip months outside the valid range
        if (year === startYear && month < startMonth) continue;
        if (year === endYear && month > endMonth) break;

        // Ensure the group starts at the correct point (e.g., June 2001 for 6 months)
        if (year === startYear && month < runningAveragePeriod) continue;

        // Get the previous months for the current group
        var previousMonths = getPreviousMonths(year, month, runningAveragePeriod);

        // Generate the collection name dynamically
        var collectionName = 'runlength_' + year + '_' + getMonthName(month);

        // Collect valid deficit variables from the global `deficitLayers` object
        var images = [];
        for (var j = 0; j < previousMonths.length; j++) {
            var date = previousMonths[j];
            var variableName = 'deficit_' + date.year + '_' + getMonthName(date.month);

            // Check if the deficit exists in `deficitLayers`
            if (deficitLayers[variableName]) {
                images.push(deficitLayers[variableName]); // Add the image to the list
            }
        }

        // Create the ImageCollection and store it if valid images are found
        if (images.length === runningAveragePeriod) {
            groupedCollections[collectionName] = ee.ImageCollection(images);
        }
    }
}

/*var exampleGroup = groupedCollections['runlength_2024_october'];
if (exampleGroup) {
    print('Runlength 2024 October:', exampleGroup);
    Map.addLayer(exampleGroup.mean(), {min: 0, max: 1, palette: ['blue', 'yellow', 'red']}, 'Runlength 2024 October');
} else {
    print('Runlength for 2024 October not available.');
}*/


//end of Grouping the images into a collection of 6 in order to compute the runlength

// A function to compute the dry spell i.e the longest period with continuous above normal temperature


/*Scripts from the following links were used as a guide to write the function for the dry spells

https://gis.stackexchange.com/questions/400817/count-of-consecutive-days-without-rain-before-an-active-fire
https://medium.com/google-earth/runs-with-arrays-400de937510a*/

function drySpells(imgcollection){
  // We're only working with a single axis: #0
  var axis = 0;
  // computes the foward difference of an array image.
  var forwardDifference = function(image) {
    var left = image.arraySlice(0, 0, -1)
    var right = image.arraySlice(0, 1)
    return left.subtract(right)
  }
  
  // Convert to a 2D array-valued image and flatten to 1D using arrayReshape().
  var precipitation = imgcollection.toArray()
  
  precipitation = precipitation.arrayReshape(precipitation.arrayLength(0).toArray(), 1)
  
  // Compute the forward difference
  var difference = forwardDifference(precipitation);
  var ones = ee.Image(ee.Array([1]))
  difference = ones.addBands(difference).toArray(0); // Prepend a 1 to the differences.
  
  
  // Make an index array sized for the length of the data in each pixel.
  var maxSize = imgcollection.size()
  var indexes = ee.Image.constant(ee.Array(ee.List.sequence(0, maxSize)));
  indexes = indexes.arraySlice(axis, 0, precipitation.arrayLength(0));
  
  
  var runStarts = indexes.arrayMask(difference.neq(0))
  var runValues = precipitation.arrayMask(difference.neq(0))
  // Append an extra index to mark the end of the last run.
  var runLengths = runStarts.addBands(precipitation.arrayLengths()).toArray(0);
  var runLengths = forwardDifference(runLengths.multiply(-1));

  var dryRunStarts = runStarts.arrayMask(runValues.eq(0))
  var dryRunLengths = runLengths.arrayMask(runValues.eq(0))
  var maxIndex = dryRunLengths.arrayArgmax().arrayGet(0)
  
  var final_dry_lengths_image = dryRunLengths.arrayGet(maxIndex)
  
  var unmasked_final_dry_lengths_image = final_dry_lengths_image.unmask({sameFootprint: false});
  
  return unmasked_final_dry_lengths_image
  
}

//end of  A function to compute the dry spell

//final runlength calculation. Change this to the month you are interested in. 
//But for this case we already define the month as endmonth at the begining

// Object to store the final runlength results
var finalRunlengths = {};

// Determine the valid start year and month based on runningAveragePeriod
var validStartYear = startYear;
var validStartMonth = runningAveragePeriod;

if (runningAveragePeriod > 12) {
    print('Error: runningAveragePeriod exceeds 12 months, which is unsupported.');
} else {
    // Loop through the years and months to calculate the final runlength for the end month
    for (var year = validStartYear; year <= endYear; year++) {
        for (var month = validStartMonth; month <= 12; month++) {
            if (year === endYear && month > endMonth) break; // Stop at the defined end month

            // Generate the variable name for the grouping (e.g., runlength_2002_february)
            var collectionName = 'runlength_' + year + '_' + getMonthName(month);

            // Generate the variable name for the final runlength (e.g., final_runlength_2002_february)
            var finalName = 'final_runlength_' + year + '_' + getMonthName(month);

            // Check if the grouped collection exists
            if (groupedCollections[collectionName]) {
                // Call the drySpells function and store the result
                finalRunlengths[finalName] = drySpells(groupedCollections[collectionName]);
            } else {
                print('Grouped collection not found for:', collectionName);
            }
        }

        // Reset validStartMonth to 1 for subsequent years
        validStartMonth = 1;
    }
}


// Load and visualize final_runlength_2012_october
/*Map.addLayer(
    finalRunlengths['final_runlength_2012_october'],
    { min: 0, max: 6, palette: ['blue', 'green', 'yellow', 'orange', 'red', 'purple', 'brown'] },
    'Final Runlength 2012 October'
);*/

///////////////////Begin modifying the runlegths by minus 7 to the runlengths images//////////////

// Object to store the modified runlength results
var modifiedRunlengths = {};

// Loop through the years to calculate the modified runlength for the end month
for (var year = startYear; year <= endYear; year++) {
    // Determine the first valid year based on the running average period
    var startYearForCalculation = startYear + Math.ceil(runningAveragePeriod / 12) - 1;

    // Skip years before the first valid year
    if (year < startYearForCalculation) continue;

    // Generate the variable names dynamically
    var finalName = 'final_runlength_' + year + '_' + getMonthName(endMonth);
    var modifiedName = 'modified_runlength_' + getMonthName(endMonth) + '_' + year;

    // Check if the final runlength exists
    if (finalRunlengths[finalName]) {
        // Calculate the modified runlength and store it
        modifiedRunlengths[modifiedName] = finalRunlengths[finalName].multiply(-1).add(7);
    } else {
        print('Final runlength not found for:', finalName);
    }
}


// Load the modified runlength for October 2023 onto the map
/*var layerName = 'modified_runlength_october_2023';

// Check if the layer exists in the modifiedRunlengths object
if (modifiedRunlengths[layerName]) {
    Map.addLayer(
        modifiedRunlengths[layerName],
        { min: 0, max: 6, palette: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c'] },
        'Modified Runlength October 2023'
    );
} else {
    print('Layer not found: ' + layerName);
}*/

///////////////////////////////end of runlength modification/////////////////////////


///////////begin grouping the modified runlegnths into one image collection and get mean ////////////////////


// Initialize an empty ImageCollection to hold the modified runlengths
var historicalModifiedRunlength = ee.ImageCollection([]);

// Define endMonthName dynamically based on endMonth
var temperatureKey = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
];
var endMonthName = temperatureKey[endMonth - 1]; // Convert month number to full month name

// Loop through the years to add the modified runlengths
for (var year = startYear; year <= endYear; year++) {
    var layerName = 'modified_runlength_' + endMonthName.toLowerCase() + '_' + year; // Correct naming convention
    //print('Looking for Layer:', layerName); // Debugging the layer name

    if (modifiedRunlengths[layerName]) {
        historicalModifiedRunlength = historicalModifiedRunlength.merge(ee.ImageCollection(modifiedRunlengths[layerName]));
    } else {
        print('Layer not found: ' + layerName); // Warn if the layer is missing
    }
}

// Compute the mean of the historical modified runlengths
var mean_modified_RL = historicalModifiedRunlength.mean();

// Log or use the mean for further calculations
//print('Historical Mean Modified Runlength:', mean_modified_RL);

/*Map.addLayer(
    mean_modified_RL,
    { min: 0, max: 6, palette: ['blue', 'green', 'yellow', 'orange', 'red', 'purple', 'brown'] },
    'Historical Mean Modified Runlength'
);*/


///////////end of grouping the modified runlegnths into one image collection and get mean ////////////////////

///////// Final Calculate the Temperature Drought Index (TDI) for the endmonth and endyear

var TDI = function () {
    // Ensure variables for the end month and year are accessible
    var runlengthAverageName = 't_mod_' + endYear + '_' + ('0' + endMonth).slice(-2) + '_runlgth_average';
    var runlengthMeanName = 't_mod_' + endMonthName.toLowerCase() + '_runlgth_mean';
    var modifiedRunlengthName = 'modified_runlength_' + endMonthName.toLowerCase() + '_' + endYear;

    // Access the required variables
    var runlengthAverage = ee.Image(runningAverageData[runlengthAverageName]); // Correct object reference
    var runlengthMean = ee.Image(runningLengthMeans[runlengthMeanName]); // Correct object reference
    var modifiedRunlength = ee.Image(modifiedRunlengths[modifiedRunlengthName]);

    // Ensure mean of the modified runlength is calculated
    var meanModifiedRL = ee.Image(mean_modified_RL); // Correct object reference

    // Calculate the PDI
    var TDI = runlengthAverage
        .divide(runlengthMean)
        .multiply(modifiedRunlength.divide(meanModifiedRL).sqrt());

    return TDI;
};

// Compute the TDI
var TDI_current = TDI();

// Add the TDI layer to the map for visualization
/*Map.addLayer(
    TDI_current,
    { min: 0, max: 6, palette: ['blue', 'green', 'yellow', 'orange', 'red'] },
    'TDI ' + endMonthName + ' ' + endYear
);*/

// Reclassification rules for TDI, 5 is no drought and 1 is extreme drought
var tdReclass = [
    '1) root 9999 9999 9999',
    '2) LST_Day_1km_mean<=0.4 9999 9999 1 *',
    '3) LST_Day_1km_mean>0.4 9999 9999 9999',
    '6) LST_Day_1km_mean<=0.6 9999 9999 2 *',
    '7) LST_Day_1km_mean>0.6 9999 9999 9999',
    '14) LST_Day_1km_mean<=0.8 9999 9999 3 *',
    '15) LST_Day_1km_mean>0.8 9999 9999 9999',
    '30) LST_Day_1km_mean<=1 9999 9999 4 *',
    '31) LST_Day_1km_mean>1 9999 9999 5 *'
].join("\n");

// Create the classifier
var pdiClassifier = ee.Classifier.decisionTree(tdReclass);

// Reclassify the TDI
var reclassifiedTDI = TDI_current
    .select('LST_Day_1km_mean')
    .classify(pdiClassifier);

// Visualization parameters for the reclassified TDI
var cdiVis = {
    min: 1,
    max: 5,
    palette: ['#930905', '#d03a27', '#e6987b', '#ffffbe', '#d2fbd2']
};

// Add a legend to the map
function addLegend(title, palette, names) {
    var legend = ui.Panel({
        style: {
            position: 'bottom-left',
            padding: '3px 3px',
            border: '1.2px solid rgb(250, 250, 250)'
        }
    });

    // Add the title to the legend
    var legendTitle = ui.Label({
        value: title,
        style: {
            fontWeight: 'bold',
            fontSize: '12px', // Smaller font size for the title
            margin: '0 0 4px 0',
            padding: '0'
        }
    });
    legend.add(legendTitle);

    // Create a row for each legend item
    for (var i = 0; i < palette.length; i++) {
        var colorBox = ui.Label({
            style: {
                backgroundColor: palette[i],
                padding: '8px',
                margin: '0 0 4px 0'
            }
        });

        var description = ui.Label({
            value: names[i],
            style: {
                fontSize: '10px', // Smaller font size for the descriptions
                margin: '0 0 4px 6px',
                
            }
        });

        var legendRow = ui.Panel({
            widgets: [colorBox, description],
            layout: ui.Panel.Layout.Flow('horizontal')
        });

        legend.add(legendRow);
    }

    Map.add(legend);
}

// Define the legend parameters
var legendTitle = 'Legend';
var palette = ['#930905', '#d03a27', '#e6987b', '#ffffbe', '#d2fbd2'];
var names = ['Extreme', 'Severe', 'Moderate', 'Mild', 'Normal'];

// Add the legend to the map
addLegend(legendTitle, palette, names);


//end of legend

// Add the reclassified TDI layer to the map
Map.addLayer(
    reclassifiedTDI.clip(aoi),
    cdiVis,
    'Reclassified PDI ' + endMonthName + ' ' + endYear
);


// Export the raw TDI
Export.image.toDrive({
    image: TDI_current.clip(aoi),
    description: 'Raw_TDI_' + endMonthName + '_' + endYear,
    scale: 5566,
    region: aoi,
    folder:'CDI_Uganda',
    maxPixels: 1e13
});

// Export the reclassified PDI
Export.image.toDrive({
    image: reclassifiedTDI.clip(aoi),
    description: 'Reclassified_TDI_' + endMonthName + '_' + endYear,
    scale: 5566,
    region: aoi,
    folder:'CDI_Uganda',
    maxPixels: 1e13
});



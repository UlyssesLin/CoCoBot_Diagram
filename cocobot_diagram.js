/*
Ulysses Lin
2022-2023
CoCoBot study results interactive diagram and heatmaps
This code is authorized for use by members of the CoCoBot project
For more information on usage, please read the README file
*/

var svg = d3.select("#diagram"),
  heatmap = d3.select('#heatmap'),
  userChecksRadio = [],
  clicked = false, // happens after clicking a rectangle but before toggleDisabled; only true if already in correlation mode (a rect was previously clicked and you click on another)
  rectClicked, // happens after clicking a rectangle
  countByPerson = true,
  filterClicked = false,
  groupChosen = {},
  getOpposite = {},
  emotions = ['ambiguous', 'negative', 'positive'],
  subNegativeRects = [],
  subPositiveRects = [],
  filters = {
    byEthnicity: false,
    byIncome: false,
    byCareReceiverAge: false
  },
  // These ethnic labels were given the "Asian" association
  // Alter the list to recategorize
  asianCategory = [
    'asian', 'asian - chinese', 'asian indian', 'chinese', 'japanese', 'korean', 'pacific islander and south asian', 'other: asian/ caucasian'
  ],
  // Maps subcategory to category
  // Ex: subcategory 'partner+issues' maps to category 'love and belonging'
  emotionMapper = {
    'self-care+good food': 'physiological',
    'self-care+nap': 'physiological',
    'self-care+sleep': 'physiological',
    'covid': 'physiological',
    'death': 'physiological',
    'self-care+eating': 'physiological',
    'self-care+sleep': 'physiological',

    'self-care+mental health': 'safety',
    'self-care+physical pain': 'safety',
    'self-care+relax': 'safety',
    'self-care+take break': 'safety',
    'self-care+exercise': 'safety',
    'own health+not feeling well': 'safety',
    'own health+physical pain': 'safety',
    'self-care+lack of exercise': 'safety',
    'uncertainty': 'safety',

    'kids+good behavior': 'love and belonging',
    'kids+spend time together': 'love and belonging',
    'family+family time': 'love and belonging',
    'spouse+spend time': 'love and belonging',
    'partner+good communication': 'love and belonging',
    'self-care+socialize with friends': 'love and belonging',
    'from others': 'love and belonging', // (Negative from others)
    'kids+difficult behavior+tantrums': 'love and belonging',
    'kids+health': 'love and belonging',
    'kids+not enough time': 'love and belonging',
    'partner+issues': 'love and belonging',
    'caregiving challenges': 'love and belonging',
    'kids+difficult behavior': 'love and belonging',
    "other's health": 'love and belonging',

    'house chores+productive': 'esteem',
    'help others': 'esteem',
    'work+generic': 'esteem',
    'work+interview': 'esteem',
    'work+productive': 'esteem',
    'coworker+conversation/interaction': 'esteem',
    'occasion': 'esteem',
    'house chores+unproductive': 'esteem',
    'house chores+stressed': 'esteem',
    'work+difficult conversation': 'esteem',
    'work+distracted': 'esteem',
    'work+frustration': 'esteem',
    'work+stressful': 'esteem',
    'work+unproductive': 'esteem',

    'role conflict': 'self-actualization'
  },
  emotionList = {
    ambiguous: [],
    negative: [],
    positive: []
  },
  emotionListCounts = {
    ambiguous: 0,
    negative: 0,
    positive: 0
  },
  cols = {
    subNegative: [],
    negative: [],
    positive: [],
    subPositive: []
  },
  sortedRects = {
    subNegative: [],
    negative: [],
    positive: [],
    subPositive: []
  },
  rects = {
    negative: [],
    positive: []
  },
  sortedCorrelatedRects = {
    negative: [],
    positive: []
  },
  correlation = {},
  boxHeight,
  boxHeightByInstance,
  boxHeightByPerson,
  WORK_MAPPER = { // NOTE: you can re-map these user-given values to 'fullTime', 'partTime' categorizations; anthing else is 'other'
    'full time': 'fullTime',
    'full-time': 'fullTime',
    'full time employed': 'fullTime',
    'full time work': 'fullTime',
    'full time worker': 'fullTime',
    'full-time unpaid caregive': 'fullTime',
    'employed': 'fullTime',
    'employed full-time': 'fullTime',
    'ft': 'fullTime',
    'work full time': 'fullTime',
    'work fulltime': 'fullTime',
    'work full-time': 'fullTime',
    'working .8 fte': 'fullTime',
    'working full time': 'fullTime',
    'working full-time': 'fullTime',
    'working full-time and caregiving': 'fullTime',
    'employed part time': 'partTime',
    '2 part time jobs & homeschool': 'partTime',
    'part time': 'partTime',
    'part time employed': 'partTime',
    'part time worker': 'partTime',
    'part-time self employed, part-time employed elsewhere': 'partTime',
    'working half-time': 'partTime',
    'working part time': 'partTime',
    'working part-time': 'partTime'
  },
  NEGATIVE_COLOR = '#5bd1d7', // color for Negative rectangles and heatmap text (originally teal)
  POSITIVE_COLOR = '#2ECC71', // color for Positive rectangles and heatmap text (originally green)
  COL_WIDTH = 250,
  INIT_Y = 100,
  BOTTOM_MARGIN = 100,
  LABEL_Y = 50,
  ROUNDED_EDGE = 8,
  BIG_STROKE = 8,
  SVG_HEIGHT = 2000,
  HEATMAP_BOX_HEIGHT = 100,
  HEATMAP_BOX_WIDTH = 100,
  INCOME_THRESHHOLD = 80000,
  HEATMAP_BUCKET_1_MAX = 10,
  HEATMAP_BUCKET_2_MAX = 20,
  SECOND_HEATMAP_OFFSET = 1400,
  OTHER_THRESHOLD = 28, // You can play with this pixel high threshold; the lower the #, the lower the max-height for a subcategory's text (i.e., you'll probably see Other split into more categories, but the text may be squished vertically)
  TOP_COUNT = 5; // # of top categories to display

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function showCount(count) {
  return count === 1 ? '' : ' (' + count + ')';
}

// Returns true for non-tester ID
function checkID(id) {
  return id != 'tester' && id.length === 4;
}

// Adds ID to list of correlated users
function addID(id, emotion, category) {
  if (checkID(id)) {
    var modded = parseInt(id.trim());
    if (!(modded in correlation)) {
      correlation[modded] = {
        negative: {},
        positive: {}
      };
    }
    if (category in correlation[modded][emotion]) {
      correlation[modded][emotion][category]++;
    } else {
      correlation[modded][emotion][category] = 1;
    }
  }
}

// Add person's ID to the list of IDs for this emotion
function addCategoryID(list, id) {
  if (checkID(id)) {
    var modded = parseInt(id.trim());
    if (list.indexOf(modded) === -1) {
      list.push(modded);
    }
  }
}

// Returns true if a person's income is under $80K
function under80K(income) {
  var cleanedIncome = income.trim();
  if (cleanedIncome === 'I do not know/do not want to share') {
    return false;
  } else if (cleanedIncome.includes('Less than')) {
    return parseInt(cleanedIncome.split('Less than $')[0].split(',').join('')) < INCOME_THRESHHOLD;
  } else if (cleanedIncome.includes('or more')) {
    return false;
  } else {
    var splitted = income.split(' to '),
      parsed = parseInt(splitted[1].substring(1).split(',').join(''));

    return parsed < INCOME_THRESHHOLD;
  }
}

// SVG text-wrapping utility from:
// https://stackoverflow.com/questions/24784302/wrapping-text-in-d3
// Use .call(wrap, <px width max>)
function wrap(text, width) {
  text.each(function () {
    var text = d3.select(this),
      words = text.text().split(/\s+/).reverse(),
      word,
      line = [],
      lineNumber = 0,
      lineHeight = 1.1, // ems
      x = text.attr("x"),
      y = text.attr("y"),
      dy = 0, //parseFloat(text.attr("dy")),
      tspan = text.text(null)
                  .append("tspan")
                  .attr("x", x)
                  .attr("y", y)
                  .attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan")
                    .attr("x", x)
                    .attr("y", y)
                    .attr("dy", ++lineNumber * lineHeight + dy + "em")
                    .text(word);
        }
    }
  });
}



// Currently uses the data file stored on my personal GitHub
// NOTE: you may replace the below GitHub posted .csv file with your own, as long as it is either on GitHub or in the same folder as the cocobot_diagram.js file
d3.csv('https://raw.githubusercontent.com/UlyssesLin/CoCoBot_Diagram/master/all_data_old.csv').then(function(data) {
// d3.csv('/all_data_old.csv').then(function(data) {
  var topY = INIT_Y,
    topYByPerson = INIT_Y;
    // labels; // for the filters at top

  // labels = d3.select('#diagram_inputs')
  //   .selectAll()
  //   .data(['Asian', 'Count by Person', 'Income Under $80K', 'Care Receiver Under 30'])
  //   .enter()
  //   .append('label');

  // labels.append('input')
  //   .attr('type', 'radio')
  //   .attr('class', function(d) { return 'checkbox ' + d.toLowerCase().split(' ').join('_'); })
  //   .property('checked', function(d) { return d === 'Count by Person'; })
  //   .attr('name', function(d) { return d; })
  //   .attr('value', function(d) { return d.toLowerCase(); })
  //   .on('change', change)

  d3.selectAll('#diagram_inputs input')
  .on('mousedown', handleInputChange)
  
  d3.selectAll('#diagram_inputs .filter')
  .on('click', handleClick)
  // d3.selectAll('#diagram_inputs ')
  
  // labels.append('span')
  //   .text(function(d) { return d; })

  // Parse the raw data
  // Sift out Ambiguous, group items by emotion
  for (row in data) {
    var thisRow = data[row],
      thisEmotion;

    if (thisRow.Emotion === 'END') {
      break;
    }
    if (!!thisRow.Emotion && checkID(thisRow.ID_NO) && emotions.includes(thisRow.Emotion.trim().toLowerCase())) {
      var category = '',
        subCategory = '';

      thisEmotion = thisRow.Emotion.trim().toLowerCase();

      if (!!thisRow.Labels) {
        subCategory = thisRow.Labels.trim().toLowerCase();
        var subCategorySplitted = thisRow.Labels.trim().toLowerCase().split('+');
        for (var i = 0; i < subCategorySplitted.length; i++) {
          subCategorySplitted[i] = subCategorySplitted[i].trim();
        }
        subCategory = subCategorySplitted.join('+');
        if (!!emotionMapper[subCategory]) {
          category = emotionMapper[subCategory];
        } else {
          category = 'other'; // NOTE: this includes things not categorized in the AMIA2022_Table file (work+struggling, work+too much work, work+unfulfilling, general)
        }

        // Category
        if (emotionList[thisEmotion][category]) { // category already exists in this emotion, so increment
          emotionList[thisEmotion][category].count++;
        } else { // category does not yet exist, so create
          if (thisEmotion === 'ambiguous') {
            emotionList.ambiguous[category] = {
              category: category,
              count: 1,
              y: 0,
              yByPerson: 0,
              id_list: []
            }
          } else {
            emotionList[thisEmotion][category] = {
              emotion: thisEmotion,
              category: category,
              subCategories: {},
              count: 1,
              y: 0,
              yByPerson: 0,
              id_list: []
            };
          }
        }
        if (thisEmotion != 'ambiguous') {
          addID(thisRow.ID_NO, thisEmotion, category);
          addCategoryID(emotionList[thisEmotion][category].id_list, thisRow.ID_NO);

          // Tally subcategory
          if (!!subCategory) {
            var subList = emotionList[thisEmotion][category].subCategories;
    
            if (!!subList[subCategory]) {
              subList[subCategory].count++;
            } else {
              subList[subCategory] = {
                category: category,
                subCategory: subCategory.toLowerCase(),
                count: 1,
                id_list: [],
                y: 0,
                yByPerson: 0
              };
            }
            addCategoryID(subList[subCategory].id_list, thisRow.ID_NO);
          }
        }
      }
    } else {
      console.log('Not an emotion: ' + thisRow.emotion);
    }
  }
  
  var otherItem = {};
  for (var type of ['negative', 'positive']) {
    for (category in emotionList[type]) {
      if (category === 'other') {
        otherItem = emotionList[type]['other'];
      } else {
        cols[type].push(emotionList[type][category]);
      }
    }
    cols[type].sort(function(a, b) {
      return a.count - b.count;
    }).reverse();
    cols[type].splice(4, cols[type].length - 4);
    !!otherItem && cols[type].push(otherItem);
  }

  // Find Neg/Pos matches, using Negative as the base
  // Once a match is found, put in sortedRects
  // If no match, put in remainder array, concat later so that
  // all non-matches come after matches
  var negRemainders = [];
  for (var n = 0; n < cols['negative'].length; n++) {
    var matchedCat = false;
    for (var i = 0; i < cols['positive'].length; i++) {
      if (cols['negative'][n].category === cols['positive'][i].category) {
        sortedRects['negative'].push(cols['negative'][n]);
        cols['positive'][i].y = cols['negative'][n].y;
        sortedRects['positive'].push(cols['positive'][i]);
        cols['positive'].splice(i, 1);
        matchedCat = true;
        break;
      }
    }
    if (!matchedCat) {
      negRemainders.push(cols['negative'][n]);
    }
  }
  sortedRects['negative'] = sortedRects['negative'].concat(negRemainders);
  sortedRects['positive'] = sortedRects['positive'].concat(cols['positive']);

  // Get max counts
  // (find max count amount paired categories, then the longest collective remainder by emotion)
  // Used primarily for box height calculations
  var maxCount = 0,
    maxCountByPerson = 0,
    mismatchedNegCount = 0,
    mismatchedPosCount = 0,
    mismatchedNegCountByPerson = 0,
    mismatchedPosCountByPerson = 0;
  for (var n = 0; n < TOP_COUNT; n++) {
    var currNeg = sortedRects['negative'][n],
      currPos = sortedRects['positive'][n];

    if (currNeg.category === currPos.category) {
      maxCount += currNeg.count >= currPos.count ? currNeg.count : currPos.count;
      maxCountByPerson += currNeg.id_list.length >= currPos.id_list.length ? currNeg.id_list.length : currPos.id_list.length;
    } else {
      mismatchedNegCount += currNeg.count;
      mismatchedPosCount += currPos.count;
      mismatchedNegCountByPerson += currNeg.id_list.length;
      mismatchedPosCountByPerson += currPos.id_list.length;
    }
  }
  
  maxCount += mismatchedNegCount >= mismatchedPosCount ? mismatchedNegCount : mismatchedPosCount;
  maxCountByPerson += mismatchedNegCountByPerson >= mismatchedPosCountByPerson ? mismatchedNegCountByPerson : mismatchedPosCountByPerson;
  boxHeightByInstance = (SVG_HEIGHT - INIT_Y - BOTTOM_MARGIN) / maxCount;
  boxHeightByPerson = (SVG_HEIGHT - INIT_Y - BOTTOM_MARGIN) / maxCountByPerson;
  boxHeight = boxHeightByPerson; // initialize to count by person boxHeight

  var lastMatched = -1,
    lastMatchedBottomY,
    lastMatchedBottomYByPerson;
  // Update y values of sortedRects, allow for vertical spacing
  for (var n = 0; n < TOP_COUNT; n++) {
    var currNeg = sortedRects['negative'][n],
      currPos = sortedRects['positive'][n],
      instanceTemp,
      personTemp,
      cN = currNeg.id_list.length,
      cP = currPos.id_list.length;

    instanceTemp = topY;
    personTemp = topYByPerson;
    // Matching categories need to "level out"
    // (i.e., if one rect is shorter, then give additional white space below
    // until bottom of other rect)
    if (currNeg.category === currPos.category) {
      topY += ((currNeg.count >= currPos.count ? currNeg : currPos).count * boxHeightByInstance);
      topYByPerson += ((cN >= cP ? cN : cP) * boxHeightByPerson);
      currNeg.y = instanceTemp;
      currPos.y = instanceTemp;
      currNeg.yByPerson = personTemp;
      currPos.yByPerson = personTemp;
      lastMatched = n;
      lastMatchedBottomY = topY;
      lastMatchedBottomYByPerson = topYByPerson;
    } else {
      break;
    }
  }
  // Non-matching categories have y just below previous rect y
  for (var type of ['negative', 'positive']) {
    for (var n = lastMatched + 1; n < TOP_COUNT; n++) {
      // temp = topY;
      instanceTemp = topY;
      personTemp = topYByPerson;
      topY += (sortedRects[type][n].count * boxHeightByInstance);
      topYByPerson += sortedRects[type][n].id_list.length * boxHeightByPerson;
      sortedRects[type][n].y = instanceTemp;
      sortedRects[type][n].yByPerson = personTemp;
    }
    topY = lastMatchedBottomY;
    topYByPerson = lastMatchedBottomYByPerson;
  }

  // Subcategories
  // If the subcategory count is too low, it's height would be shorter than the font, and is thus grouped into "Other"
  // Stretch goal: logic for cutting off for Other is poor
  for (var type of ['negative', 'positive']) {
    for (var category in sortedRects[type]) {
      var subs = sortedRects[type][category].subCategories;

      if (!!Object.keys(subs).length) {
        var count = 0,
          tempSorter = [];
        for (var subcat in subs) {
          tempSorter.push(subs[subcat]);
        }
        tempSorter.sort(function(a, b) {
          return a.count - b.count;
        }).reverse();
        var otherN = -1;
        for (var n = 0; n < tempSorter.length; n++) {
          var counter = countByPerson ? tempSorter[n].id_list.length : tempSorter[n].count;
          if (counter * boxHeightByPerson < OTHER_THRESHOLD || (tempSorter[n].subCategory.length + counter.toString().length > 27 && counter * boxHeightByPerson < 40)) {
            tempSorter[n - 1].subCategory = 'Other';
            otherN = n - 1;
            break;
          }
        }
        if (otherN > -1) {
          for (var i = otherN; i < tempSorter.length; i++) {
            count += tempSorter[i].count;
          }
          tempSorter[otherN].otherCount = count;
          tempSorter.length = otherN + 1;
        }
        topY = sortedRects[type][category].y;
        topYByPerson = sortedRects[type][category].yByPerson;
        var totalInstanceCounts = 0,
          totalPersonCounts = 0;
        for (var subcat of tempSorter) {
          totalPersonCounts += subcat.otherCount || subcat.id_list.length;
          totalInstanceCounts += subcat.count;
        }

        for (var n = 0; n < tempSorter.length; n++) {
          temp = topY;
          tempByPerson = topYByPerson;
          topY += (tempSorter[n].count * boxHeightByInstance);
          topYByPerson += (tempSorter[n].id_list.length / totalPersonCounts) * sortedRects[type][category].id_list.length * boxHeight;
          tempSorter[n].y = temp;
          tempSorter[n].yByPerson = tempByPerson;
        }
        sortedRects['sub' + capitalize(type)] = sortedRects['sub' + capitalize(type)].concat(tempSorter);
      }
    }
  }



  // HEATMAPS

  // User List
  var userListArray = [];
  for (var [key, value] of Object.entries(correlation)) {
    userListArray.push(key);
  }

  function mapEmployment(rawEmployment) {
    return WORK_MAPPER[rawEmployment] || 'otherTime';
  }

  var totalHeatmapCounts = {
    negative: {
      'fullTime': 0,
      'partTime': 0,
      'otherTime': 0,
      'asian': 0,
      'income_under_80': 0,
      'receiver_under_30': 0,
      'non_asian': 0,
      'non_income_under_80': 0,
      'non_receiver_under_30': 0,
      'asianANDincome_under_80': 0,
      'asianANDnon_income_under_80': 0,
      'non_asianANDincome_under_80': 0,
      'non_asianANDnon_income_under_80': 0
    },
    positive: {
      'fullTime': 0,
      'partTime': 0,
      'otherTime': 0,
      'asian': 0,
      'income_under_80': 0,
      'receiver_under_30': 0,
      'non_asian': 0,
      'non_income_under_80': 0,
      'non_receiver_under_30': 0,
      'asianANDincome_under_80': 0,
      'asianANDnon_income_under_80': 0,
      'non_asianANDincome_under_80': 0,
      'non_asianANDnon_income_under_80': 0
    }
  };

  // NOTE: you may replace the below GitHub posted .csv file with your own, as long as it is either on GitHub or in the same folder as the cocobot_diagram.js file
  // d3.csv('https://raw.githubusercontent.com/UlyssesLin/CoCoBot_Diagram/master/coco-demographics.csv').then(function(data) {
  d3.csv('/coco-demographics.csv').then(function(data) {
    // Demographically categorize each person
    for (var csvPerson of data) {
      if (correlation[csvPerson.Id]) {
        var correlationPerson = correlation[csvPerson.Id];
  
        correlationPerson.asian = asianCategory.includes(csvPerson.Ethnicity.toLowerCase().trim());
        correlationPerson.income_under_80 = under80K(csvPerson.Income);
        correlationPerson.receiver_under_30 = csvPerson.Receiver_age < 30;
        correlationPerson.employment = mapEmployment(csvPerson.Employment.toLowerCase().trim());
      }
    }

    // By person count, not instance
    function getEmotionPercents() {
      var nons = 0;
      for (var emotion of ['negative', 'positive']) {
        for (var categoryRect of sortedRects[emotion]) {
          if (!categoryRect.heatmapCounts) {
            categoryRect.heatmapCounts = {
              'fullTime': 0,
              'partTime': 0,
              'otherTime': 0,
              'asian': 0,
              'income_under_80': 0,
              'receiver_under_30': 0,
              'non_asian': 0,
              'non_income_under_80': 0,
              'non_receiver_under_30': 0,
              'asianANDincome_under_80': 0,
              'asianANDnon_income_under_80': 0,
              'non_asianANDincome_under_80': 0,
              'non_asianANDnon_income_under_80': 0
            };
          }
          for (var id of categoryRect.id_list) {
            var p = correlation[id];
            if (!['fullTime', 'partTime', 'otherTime'].includes(p.employment)) {
              // console.log(p);
              nons++;
            } else {
              // console.log(p);
            }
            categoryRect.heatmapCounts[p.employment]++;
            totalHeatmapCounts[emotion][p.employment]++;
            for (var cat of ['asian', 'income_under_80', 'receiver_under_30']) {
              if (p[cat]) {
                categoryRect.heatmapCounts[cat]++;
                totalHeatmapCounts[emotion][cat]++;
              } else { // tally inverses: non_asian, non_income_under_80, non_receiver_under_30
                categoryRect.heatmapCounts['non_' + cat]++;
                totalHeatmapCounts[emotion]['non_' + cat]++;
              }
            }
            // Combinations
            if (p['asian']) {
              if (p['income_under_80']) {
                categoryRect.heatmapCounts['asianANDincome_under_80']++;
                totalHeatmapCounts[emotion]['asianANDincome_under_80']++;
              } else {
                categoryRect.heatmapCounts['asianANDnon_income_under_80']++;
                totalHeatmapCounts[emotion]['asianANDnon_income_under_80']++;
              }
            } else {
              if (p['income_under_80']) {
                categoryRect.heatmapCounts['non_asianANDincome_under_80']++;
                totalHeatmapCounts[emotion]['non_asianANDincome_under_80']++;
              } else {
                categoryRect.heatmapCounts['non_asianANDnon_income_under_80']++;
                totalHeatmapCounts[emotion]['non_asianANDnon_income_under_80']++;
              }
            }
          }
        }
        for (var categoryRect of sortedRects[emotion]) {
          for (var cat of ['fullTime', 'partTime', 'otherTime', 'asian', 'income_under_80', 'receiver_under_30', 'non_asian', 'non_income_under_80', 'non_receiver_under_30', 'asianANDincome_under_80', 'asianANDnon_income_under_80', 'non_asianANDincome_under_80', 'non_asianANDnon_income_under_80']) {
            categoryRect.heatmapCounts[cat + '_tooltip'] = '(' + categoryRect.heatmapCounts[cat] + '/' + totalHeatmapCounts[emotion][cat] + ')';
            categoryRect.heatmapCounts[cat] = Math.round(categoryRect.heatmapCounts[cat] * 100 / totalHeatmapCounts[emotion][cat]);
          }
        }
      }
      // console.log('nons: ', nons);
    }
  
    var emotionLabelY = 200;
  
    // Spacing for negative and positive labels for heatmaps
    for (var emotionLabel of sortedRects.negative) {
      emotionLabel.emotionLabelY = emotionLabelY;
      emotionLabelY += HEATMAP_BOX_HEIGHT;
    }
    emotionLabelY += 50; // space between negatives and positives
    for (var emotionLabel of sortedRects.positive) {
      emotionLabel.emotionLabelY = emotionLabelY;
      emotionLabelY += HEATMAP_BOX_HEIGHT;
    }
    
    getEmotionPercents();


    // Heatmap
    heatmap.append('g')
      .attr('id', 'heatmapDiagram')

    // Create heatmap column wrappers (<g>)
    heatmap.select('#heatmapDiagram')
      .selectAll('path')
      .data(['emotionLabels', 'groupLabels', 'fullTimeCol', 'partTimeCol', 'otherTimeCol', 'asianCol', 'non_asianCol', 'income_under_80Col', 'non_income_under_80Col', 'receiver_under_30Col', 'non_receiver_under_30Col', 'asianANDincome_under_80Col', 'asianANDnon_income_under_80Col', 'non_asianANDincome_under_80Col', 'non_asianANDnon_income_under_80Col'])
      .enter()
      .append('g')
      .attr('id', function(d) {
        return d;
      })



    
    // Heatmap mapper for string<--->var conversion
    var fullTime, partTime, otherTime, asian, non_asian, income_under_80, non_income_under_80, receiver_under_30, non_receiver_under_30, asianANDincome_under_80, asianANDnon_income_under_80, non_asianANDincome_under_80, non_asianANDnon_income_under_80,
      heatmapColMapper = {
        fullTime: fullTime,
        partTime: partTime,
        otherTime: otherTime,
        asian: asian,
        non_asian: non_asian,
        income_under_80: income_under_80,
        non_income_under_80: non_income_under_80,
        receiver_under_30: receiver_under_30,
        non_receiver_under_30: non_receiver_under_30,
        asianANDincome_under_80: asianANDincome_under_80, 
        asianANDnon_income_under_80: asianANDnon_income_under_80, 
        non_asianANDincome_under_80: non_asianANDincome_under_80, 
        non_asianANDnon_income_under_80: non_asianANDnon_income_under_80
      };

    // Create column wrappers
    for (var key of Object.keys(heatmapColMapper)) {
      heatmapColMapper[key] = heatmap.select('#' + key + 'Col')
        .selectAll('path')
        .data(sortedRects.negative.concat(sortedRects.positive))
        .enter()
        .append('g')
        .attr('width', 100)
    }

    // Wrappers for blue and green labels to the left
    var emotionLabels = heatmap.select('#emotionLabels')
      .selectAll('path')
      .data(sortedRects.negative.concat(sortedRects.positive))
      .enter()
      .append('g')
      .attr('width', 100)

    // Wrappers for group labels at the top and side ("Employment", "Negative", etc.)
    var verticalLabels = heatmap.select('#groupLabels')
      .selectAll('path')
      .data([
        {
          emotion: 'negative',
          y: 500
        },
        {
          emotion: 'positive',
          y: 1000
        }
      ])
      .enter()
      .append('g')

    // Wrappers and positioning of the top group labels
    var horizontalLabels = heatmap.select('#groupLabels')
      .selectAll('path')
      .data([
        {
          group: 'Employment',
          x: 670
        },
        {
          group: 'Ethnicity',
          x: 940
        },
        {
          group: 'Income',
          x: 1160
        },
        {
          group: 'Caregiver\nAge',
          x: 1380
        }
      ])
      .enter()
      .append('g')


  
    // Top horizontal group labels ("Employment", "Ethnicity", etc.)
    horizontalLabels
      .append('text')
      .attr('id', function(d) {
        return 'horizontal_' + d.group;
      })
      .text(function(d) { return capitalize(d.group); })
      .attr('fill', 'black')
      .attr('x', function(d) {
        return d.x;
      })
      .attr('y', 20)
      .style('text-anchor', 'middle')
      .style('font-weight', 900)
      .style('font-size', '24px')

    // Singular top label for ethnicity & income combinations (2nd heatmap)
    heatmap.select('#emotionLabels')
      .append('g')
      .append('text')
      .attr('id', 'horizontal_ethnicityANDincome')
      .text('Ethnicity & Income')
      .attr('fill', 'black')
      .attr('x', 720)
      .attr('y', SECOND_HEATMAP_OFFSET - 50)
      .style('text-anchor', 'middle')
      .style('font-weight', 900)
      .style('font-size', '24px')

    // Demographic labels above squares
    var heatmapLabelX = 570,
      singleDemographics = ['Full Time', 'Part Time', 'Other', 'Asian', 'Non-Asian', 'Less Than $80k', '$80k and Up', 'Less Than 30', '30 and Up'],
      comboDemographics = ['Asian Earning <$80k', 'Asian Earning $80k+', 'Non-Asian Earning <$80k', 'Non-Asian Earning $80k+'];

    heatmap.select('#groupLabels')
      .selectAll('path')
      .data(singleDemographics.concat(comboDemographics))
      .enter()
      .append('text')
      .style('font-size', '20px')
      .attr('x', function(d) {
        var toRet = heatmapLabelX;
        heatmapLabelX += ['Other', 'Non-Asian', '$80k and Up'].includes(d) ? 120 : 100;
        ['30 and Up', 'Non-Asian Earning $80k+'].includes(d) && (heatmapLabelX = 570); // reset for 2nd heatmap's transform x's
        return toRet - 20;
      })
      .attr('y', function(d) {
        return comboDemographics.includes(d) ? SECOND_HEATMAP_OFFSET + 140 : 140;
      })
      .style('font-weight', 600)
      .attr('fill', 'black')
      .text(function(d) {
        return d;
      })
      .attr('transform', function(d) { // lean them diagonally
        var toRet = heatmapLabelX,
          y;
        heatmapLabelX += ['Other', 'Non-Asian', '$80k and Up'].includes(d) ? 120 : 100;
        y = comboDemographics.includes(d) ? SECOND_HEATMAP_OFFSET + 140 : 140;
        d === '30 and Up' && (heatmapLabelX = 570);
        return 'rotate(315, ' + (toRet - 20) + ', ' + y + ')';
      })

    // Negative/Positive vertical labels to the left
    for (var yy of [0, SECOND_HEATMAP_OFFSET]) {
      verticalLabels
        .append('text')
        .attr('id', function(d) {
          return 'vertical_' + d.emotion;
        })
        .text(function(d) { return capitalize(d.emotion); })
        .attr('fill', function(d) {
          return d.emotion === 'negative' ? NEGATIVE_COLOR : POSITIVE_COLOR;
        })
        .attr('x', 100)
        .attr('y', function(d) {
          return d.y + yy;
        })
        .style('font-weight', 900)
        .style('font-size', '36px')
        .attr('transform', function(d) { // turn on side
          return 'rotate(270, 100, ' + (d.y + yy) + ')';
        })
    }

    // Left-hand labels for the 10 emotions
    for (var yy of [0, SECOND_HEATMAP_OFFSET]) {
      emotionLabels
        .append('text')
        .attr('id', function(d) {
          return d.emotion + '_' + d.category + '_heatmap_' + yy;
        })
        .attr('class', 'heatmapLabel')
        .style('font-size', '24px')
        .attr('x', 475)
        .attr('y', function(d) {
          return d.emotionLabelY + yy;
        })
        .style('font-weight', 900)
        .attr('fill', function(d) {
          return d.emotion === 'negative' ? NEGATIVE_COLOR : POSITIVE_COLOR;
        })
        .text(function(d) { return capitalize(d.category); })
        .style('text-anchor', 'end')
        .append('tspan')
        .text(function(d) { return showCount(d.id_list.length); })
    }

    var tooltipToFind;

    // Show the upper
    function tooltip(box, col, emotion, category) {
      tooltipToFind = '[tooltipDesc="' + col + '+' + emotion + '+' + category + '"]';
      heatmap.select(tooltipToFind)
        .style('visibility', 'visible')
    }

    var colorScale = d3.scaleLinear()
      .domain([0, 30])
      .range(['blue','brown'])

    // Display heatmap colored squares
    var heatmapColX = 520,
      comboDemographics = ['asianANDincome_under_80', 'asianANDnon_income_under_80', 'non_asianANDincome_under_80', 'non_asianANDnon_income_under_80'];

    for (var heatmapCol of Object.keys(heatmapColMapper)) {
      heatmapColMapper[heatmapCol]
        .append('rect')
        .attr('class', 'hoverRect')
        .attr('colName', function(d) { return heatmapCol; })
        .attr('x', heatmapColX)
        .attr('y', function(d) {
          var yy = comboDemographics.includes(heatmapCol) ? SECOND_HEATMAP_OFFSET : 0;
          return d.emotionLabelY + yy - 50;
        })
        .attr('width', HEATMAP_BOX_WIDTH)
        .attr('height', function(d) {
          return 100;
        })
        .attr('fill', function(d) {
          return colorScale(d.heatmapCounts[heatmapCol]);
        })
        .style('opacity', 1)
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
    
      // Percentage text inside squares
      heatmapColMapper[heatmapCol]
        .append('text')
        .attr('class', 'hoverRectText hoverRect')
        .attr('colName', function(d) { return heatmapCol; })
        .style('font-size', '24px')
        .attr('x', heatmapColX + 50)
        .attr('y', function(d) {
          var yy = comboDemographics.includes(heatmapCol) ? SECOND_HEATMAP_OFFSET : 0;
          return d.emotionLabelY + yy + 9;
        })
        .style('font-weight', 900)
        .attr('fill', 'white')
        .text(function(d) { return d.heatmapCounts[heatmapCol] + '%'; })
        .style('text-anchor', 'middle')

      // Animation for hovering over squares
      heatmap.selectAll('.hoverRect')
        .on('mouseover', function(box) {
          d3.select(this.parentNode).select('.hoverRectText')
            .style('font-size', '36px')
            .style('font-weight', 600)
            .attr('y', function() {
              return parseInt(this.getAttribute('y')) + 5;
            })
          tooltip(this, box.currentTarget.getAttribute('colName'), box.currentTarget.__data__.emotion, box.currentTarget.__data__.category);
        })
        .on('mouseout', function() {
          d3.select(this.parentNode).select('.hoverRectText')
            .style('font-size', '24px')
            .style('font-weight', 900)
            .attr('y', function() {
              return parseInt(this.getAttribute('y')) - 5;
            })
          heatmap.select(tooltipToFind)
            .style('visibility', 'hidden')
        })

      // Mouseover count / col total text in upper left
      heatmapColMapper[heatmapCol]
        .append('text')
        .attr('id', function(d) {
          return 'tooltip_' + heatmapCol + '_' + d.emotion + '_' + d.category;
        })
        .attr('tooltipDesc', function(d) {
          return heatmapCol + '+' + d.emotion + '+' + d.category;
        })
        .style('font-size', '24px')
        .attr('x', 400)
        .attr('y', function(d) {
          return comboDemographics.includes(heatmapCol) ? SECOND_HEATMAP_OFFSET + 100 : 100;
        })
        .style('font-weight', 900)
        .attr('fill', 'black')
        .text(function(d) {
          return d.heatmapCounts[heatmapCol + '_tooltip'];
        })
        .style('text-anchor', 'middle')
        .style('visibility', 'hidden')

      heatmapColX += ['otherTime', 'non_asian', 'non_income_under_80'].includes(heatmapCol) ? 120 : 100;
      heatmapCol === 'non_receiver_under_30' && (heatmapColX = 520);
    }

  }); // END HEATMAP


  // Logging objects made
  console.log('correlation', correlation);
  console.log('emotionList', emotionList);
  console.log('cols.subNegative', cols.subNegative);
  console.log('cols.subPositive', cols.subPositive);
  console.log('cols.negative', cols.negative);
  console.log('cols.positive', cols.positive);
  console.log('rects.negative', rects.negative);
  console.log('rects.positive', rects.positive);
  console.log('sortedRects.negative', sortedRects.negative); // sortedRects are probably the most important to track
  console.log('sortedRects.positive', sortedRects.positive);
  console.log('sortedRects.subNegative', sortedRects.subNegative);
  console.log('sortedRects.subPositive', sortedRects.subPositive);

  

  /****************************************************************************************
  Interactive diagram with Negative and Positive blue/green columns and subcategory columns
  *****************************************************************************************/
  svg.append('g')
    .attr('id', 'coCoBotDiagram')

  // Wrappers for columns
  svg.select('#coCoBotDiagram')
    .selectAll('path')
    .data(['negativeColSub', 'negativeCol', 'correlatedNegativeCol', 'positiveCol', 'positiveColSub'])
    .enter()
    .append('g')
    .attr('id', function(d) { return d; })

  // Negative subcategories column rectangles wrappers
  var subNegativeRectangles = svg.select('#negativeColSub')
    .selectAll('path')
    .data(sortedRects.negative)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH);

  // Negative subcategories text wrappers
  var subNegatives = svg.select('#negativeColSub')
    .selectAll('path')
    .data(sortedRects.subNegative)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH);

  // Negative column rectangles wrappers
  var negatives = svg.select('#negativeCol')
    .selectAll('path')
    .data(sortedRects.negative)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH)
    .on('click', animateCorrelation)

  // Positive column rectangles wrappers
  var positives = svg.select('#positiveCol')
    .selectAll('path')
    .data(sortedRects.positive)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH)
    .on('click', animateCorrelation)

  // Positive subcategories rectangles wrappers
  var subPositiveRectangles = svg.select('#positiveColSub') // note: rects must come before text/lines
    .selectAll('path')
    .data(sortedRects.positive)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH);
    
  // Positive subcategories text wrappers
  var subPositives = svg.select('#positiveColSub')
    .selectAll('path')
    .data(sortedRects.subPositive)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH);

  // Labelling
  svg.select("#negativeColSub")
    .append('text')
    .style('font-size', '16px')
    .style('text-anchor', 'middle')
    .attr('x', 220)
    .attr('y', LABEL_Y)
    .style('font-weight', 600)
    .attr('fill', 'black')
    .text('Negative Subcategories')

  svg.select("#negativeCol")
    .append('text')
    .style('font-size', '32px')
    .style('text-anchor', 'middle')
    .attr('x', 480)
    .attr('y', LABEL_Y)
    .style('font-weight', 600)
    .attr('fill', 'black')
    .text('Negative')

  svg.select("#positiveCol")
    .append('text')
    .style('font-size', '32px')
    .style('text-anchor', 'middle')
    .attr('x', 740)
    .attr('y', LABEL_Y)
    .style('font-weight', 600)
    .attr('fill', 'black')
    .text('Positive')

  svg.select("#positiveColSub")
    .append('text')
    .style('font-size', '16px')
    .style('text-anchor', 'middle')
    .attr('x', 1000)
    .attr('y', LABEL_Y)
    .style('font-weight', 600)
    .attr('fill', 'black')
    .text('Positive Subcategories')

  // Negative Subcategory Column Rectangles
  subNegativeRectangles
    .append('rect')
    .attr('class', function(d) { return 'subRect subNegativeRect_' + d.category.replace(/\s/g, '_'); })
    .attr('x', 100)
    .attr('y', function(d) {
      return countByPerson ? d.yByPerson : d.y;
    })
    .attr('width', COL_WIDTH)
    .attr('height', function(d) {
      return (countByPerson ? d.id_list.length : d.count) * boxHeight;
    })
    .attr('rx', ROUNDED_EDGE)
    .style('fill', NEGATIVE_COLOR)
    .style('opacity', 0.5)
    .attr('stroke', 'white')
    .attr('stroke-width', BIG_STROKE)

  // Negative Subcategory Column Text
  subNegatives
    .append('text')
    .attr('class', 'subNegative')
    .style('font-size', '12px')
    .attr('x', 340)
    .attr('y', function(d) {
      return d.yByPerson + 16;
    })
    .style('font-weight', 600)
    .attr('fill', '#17223b')
    .text(function(d) {
      return capitalize(d.subCategory) + ' ' + showCount(d.subCategory === 'Other' ? d.otherCount : d.id_list.length);
    })
    .style('text-anchor', 'end')
    .style('border', 'white')
    .call(wrap, 230)

  // Negative Subcategory Border Lines
  subNegatives
    .append('line')
      .attr('class', 'subNegativeLine')
      .attr('x1', 100)
      .attr('x2', 350)
      .attr('y1', function(d) { return d.yByPerson; })
      .attr('y2', function(d) { return d.yByPerson; })
      .attr('stroke', 'white')
      .attr('stroke-width', '2px')

  // Negative Column Rectangles
  negatives
    .append('rect')
    .attr('class', function(d) { return 'mainRect negativeRect_' + d.category; })
    .attr('x', 350)
    .attr('y', function(d) {
      return countByPerson ? d.yByPerson : d.y;
    })
    .attr('width', COL_WIDTH)
    .attr('height', function(d) {
      return (countByPerson ? d.id_list.length : d.count) * boxHeight;
    })
    .attr('rx', ROUNDED_EDGE)
    .style('fill', NEGATIVE_COLOR)
    .style('opacity', 1)
    .attr('stroke', 'white')
    .attr('stroke-width', BIG_STROKE)
    .on('mouseover', rectHover)
    .on('mouseleave', rectLeave)
    .on('click', rectClick)

  // Correlated Negative Column Rectangles
  negatives
    .append('rect')
    .attr('class', function(d) { return 'correlatedRect negativeRect_' + d.category; })
    .attr('x', 350 + BIG_STROKE/2)
    .attr('y', function(d) {
      return (countByPerson ? d.yByPerson : d.y) + BIG_STROKE/2;
    })
    .attr('width', COL_WIDTH - BIG_STROKE)
    .attr('height', 0)
    .attr('rx', ROUNDED_EDGE)
    .style('fill', NEGATIVE_COLOR)
    .style('opacity', 1)

  topY = INIT_Y;

  // Negative Column Text
  negatives
    .append('text')
    .attr('id', function(d) {
      return 'negative_' + d.category;
    })
    .attr('class', 'negativeItem colText')
    .style('font-size', '16px')
    .attr('x', 475)
    .attr('y', function(d) {
      return (countByPerson ? d.yByPerson : d.y) + 20;
    })
    .style('font-weight', 600)
    .attr('fill', 'white')
    .text(function(d) { return capitalize(d.category); })
    .style('text-anchor', 'middle')
    .append('tspan')
    .text(function(d) { return showCount(d.id_list.length); })

    topY = INIT_Y - 20;


  // ---------------------POSITIVE---------------------


  // Positive Column Rectangles
  positives
    .append('rect')
    .attr('class', function(d) { return 'mainRect positiveRect_' + d.category; })
    .attr('x', 620)
    .attr('y', function(d) {
      return countByPerson ? d.yByPerson : d.y;
    })
    .attr('width', COL_WIDTH)
    .attr('height', function(d) {
      return (countByPerson ? d.id_list.length : d.count) * boxHeight;
    })
    .attr('rx', ROUNDED_EDGE)
    .style('fill', POSITIVE_COLOR)
    .style('opacity', 1)
    .attr('stroke', 'white')
    .attr('stroke-width', BIG_STROKE)
    .on('mouseover', rectHover)
    .on('mouseleave', rectLeave)
    .on('click', rectClick)

  // Correlated Positive Column Rectangles
  positives
    .append('rect')
    .attr('class', function(d) { return 'correlatedRect positiveRect_' + d.category; })
    .attr('x', 620 + BIG_STROKE / 2)
    .attr('y', function(d) {
      return (countByPerson ? d.yByPerson : d.y) + BIG_STROKE / 2;
    })
    .attr('width', COL_WIDTH - BIG_STROKE)
    .attr('height', 0)
    .attr('rx', ROUNDED_EDGE)
    .style('fill', POSITIVE_COLOR)
    .style('opacity', 1)

  // Positive Column Text
  positives
    .append('text')
    .attr('id', function(d) {
      return 'positive_' + d.category;
    })
    .attr('class', 'positiveItem colText')
    .style('font-size', '16px')
    .attr('x', 745)
    .attr('y', function(d) {
      return (countByPerson ? d.yByPerson : d.y) + 20;
    })
    .style('font-weight', 600)
    .attr('fill', 'white')
    .text(function(d) { return capitalize(d.category); })
    .style('text-anchor', 'middle')
    .append('tspan')
    .text(function(d) { return showCount(d.id_list.length); })
    
  // Positive Subcategory Column Rectangles
  subPositiveRectangles
    .append('rect')
    .attr('class', function(d) { return 'subRect subPositiveRect_' + d.category; })
    .attr('x', 870)
    .attr('y', function(d) {
      return countByPerson ? d.yByPerson : d.y;
    })
    .attr('width', COL_WIDTH)
    .attr('height', function(d) {
      return (countByPerson ? d.id_list.length : d.count) * boxHeight;
    })
    .attr('rx', ROUNDED_EDGE)
    .style('fill', POSITIVE_COLOR)
    .style('opacity', 0.5)
    .attr('stroke', 'white')
    .attr('stroke-width', BIG_STROKE)
  
  // Positive Subcategory Column Text
  subPositives
    .append('text')
    .attr('class', 'subPositive')
    .style('font-size', '12px')
    .attr('x', 880)
    .attr('y', function(d) {
      return (countByPerson ? d.yByPerson : d.y) + 16;
    })
    .style('font-weight', 600)
    .attr('fill', '#17223b')
    .text(function(d) { 
      return capitalize(d.subCategory) + ' ' + showCount(d.subCategory === 'Other' ? d.otherCount : d.id_list.length);
    })
    .style('text-anchor', 'start')
    .style('border', 'white')
    .call(wrap, 230)
  
  // Positive Subcategory Border Lines
  subPositives
    .append("line")
    .attr('class', 'subPositiveLine')
    .attr("x1", 870)
    .attr("x2", 1120)
    .attr("y1", function(d) { return d.yByPerson; })
    .attr("y2", function(d) { return d.yByPerson; })
    .attr("stroke", "white")
    .attr("stroke-width", "2px")


    

  // ---------------------------ANIMATION-----------------------------
  // Hover onto a negative/positive rectangle - change opacity
  function rectHover(a, b) {
    if (!clicked && !filterClicked) { // only animate hover if no correlation requested
      d3.select(this)
        .transition()
        .duration(100)
        .style('opacity', 0.2)
      d3.select('#' + b.emotion + '_' + b.category)
        .attr('fill', 'black')
    }
  }

  // Hover off a negative/positive rectangle - change opacity
  function rectLeave(a, b) {
    if (!clicked && !filterClicked) { // only animate hover if no correlation requested
      d3.select(this)
        .transition()
        .duration(100)
        .style('opacity', 1)
      d3.select('#' + b.emotion + '_' + b.category)
        .attr('fill', 'white')
    }
  }

  // Clicking on a rectangle shows correlation in the other rectangles
  // Hides subcategories
  function rectClick(a, b) {
    if (!filterClicked) {
      rectClicked = this;
      svg.selectAll('.mainRect')
        .attr('stroke', 'white')
      d3.select(this)
        .attr('stroke', 'black')
        .attr('stroke-width', BIG_STROKE)
      svg.select('#negativeColSub').transition()
        .duration(500)
        .style('opacity', 0)
      svg.select('#positiveColSub').transition()
        .duration(500)
        .style('opacity', 0)
      subNegatives.transition()
        .duration(500)
        .style('opacity', 0)
      subNegativeRectangles.transition()
        .duration(500)
        .style('opacity', 0)
      subPositives.transition()
        .duration(500)
        .style('opacity', 0)
      subPositiveRectangles.transition()
        .duration(500)
        .style('opacity', 0)
    }
  }
  
  function toggleDisabled() {
    if (!clicked && rectClicked) {
      for (var name of ['mode', 'byEthnicity', 'byIncome', 'byCareReceiverAge']) {
        var group = document.getElementsByName(name);
    
        for (var j = 0; j < group.length; j++) {
          group[j].disabled = !group[j].disabled;
        }
      }
    }
  }

  // SHOW CORRELATION ANIMATION
  function animateCorrelation(a, b) {
    if (!filterClicked) {
      var mainRects = d3.selectAll('.mainRect:not(.' + b.emotion + 'Rect_' + b.category + ')'),
      corrRects = d3.selectAll('.correlatedRect');
      
      toggleDisabled();
      clicked = true;
      getGroupCorrelated(b.emotion, b.category);

      mainRects.transition()
        .duration(500)
        .style('opacity', 0.2)

      corrRects.transition()
        .duration(1500)
        .attr('height', function(d) {
          return countByPerson ? 
            d.correlatedCountByPerson * boxHeightByPerson : 
            d.correlatedCount * boxHeightByInstance;
        })

      toggleCountDisplay();
    }
  }

  // Checks if a rectangle is the rectangle selected
  function thisRect(type, i, ctype, ci) {
    return type === ctype && i === ci;
  }

  // Calculates the correlated instances or person counts
  function getGroupCorrelated(selected_emotion, selected_category) {
    // Initialize correlatedCount for each sortedRect
    for (var type of ['negative', 'positive']) {
      for (var i = 0; i < 5; i++) {
        // clicked at very start
        if (sortedRects[type][i].tempPersonList === undefined) {
          sortedRects[type][i].tempPersonList = sortedRects[type][i].id_list;
        }
        sortedRects[type][i].correlatedCount = 0;
        sortedRects[type][i].correlatedCountByPerson = 0;
      }
    }
    for (var j = 0; j < 5; j++) {
      if (sortedRects[selected_emotion][j].category === selected_category) {
        toCheck = sortedRects[selected_emotion][j]; // emotion/category block to check correlation for
        toCheck.clickedRect = true;
        break;
      }
    }
    for (var id in toCheck.id_list) {
      var cid = toCheck.id_list[id];
      for (var type of ['negative', 'positive']) {
        for (var category in correlation[cid][type]) {
          for (var i = 0; i < 5; i++) {
            if (!(thisRect(toCheck.emotion, toCheck.category, type, sortedRects[type][i].category)) && sortedRects[type][i].category === category) {
              sortedRects[type][i].correlatedCount += correlation[cid][type][category];
              sortedRects[type][i].correlatedCountByPerson++;
              break;
            }
          }
        }
      }
    }
  }

  // Uncheck all filters
  function uncheckAllFilters() {
    for (var name of ['byEthnicity', 'byIncome', 'byCareReceiverAge']) {
      var group = document.getElementsByName(name);
  
      for (var j = 0; j < group.length; j++) {
        if (group[j].checked) {
          group[j].checked = false;
        }
      }
    }

    filters = {
      byEthnicity: false,
      byIncome: false,
      byCareReceiverAge: false
    };

    groupChosen = {};
    getOpposite = {};
    filterClicked = false;
  }

  // When clicking off of the diagram, return to initial visual state
  function returnToInitialVisualState(e) {
    if (e && e.target) {
      triggersEvent = Array.from(e.target.classList).some(function(toCheck) {
          return ['mainRect', 'subRect', 'radio', 'correlatedRect'].includes(toCheck);
      });
    } else {
      triggersEvent = false;
    }
    if (!triggersEvent) { // reset visuals (rects are at full height and opacity)
      var mainRects = d3.selectAll('.mainRect'),
        corrRects = d3.selectAll('.correlatedRect');

      uncheckAllFilters();
      clicked = false;
      toggleDisabled();
      
      if (rectClicked) {
        d3.select(rectClicked)
          .attr('stroke', 'white')
          .attr('stroke-width', BIG_STROKE)
        d3.select('#' + rectClicked.__data__.emotion + '_' + rectClicked.__data__.category)
          .attr('fill', 'white')
        
        sortedRects[rectClicked.__data__.emotion].find(function(searched) { 
          return searched.category === rectClicked.__data__.category; 
        }).clickedRect = false; // clicked rect in sortedRects no longer marked

        rectClicked = undefined;
      }
      svg.select('#negativeColSub')
        .style('opacity', 1)
      svg.select('#positiveColSub')
        .style('opacity', 1)
      subNegatives
        .style('opacity', 1)
      subNegativeRectangles
        .style('opacity', 1)
      subPositives
        .style('opacity', 1)
      subPositiveRectangles
        .style('opacity', 1)
      mainRects
        .style('opacity', 1)
      corrRects
        .attr('height', 0)
      svg.selectAll('.mainRect')
        .attr('stroke', 'white')

      toggleCountDisplay();
    }
  };

  // Unchecks radio button if user clicks on a checked radio button
  function handleClick(event) {
    userChecksRadio[event.target.id] = !userChecksRadio[event.target.id];
    if (userChecksRadio[event.target.id]) {
      event.target.checked = false;
    }
  }

  // Filters
  function handleInputChange(event) {
    var selectedCheckbox = event.target.value,
    toSwitch = [],
    categoryToSwitch,
    countByToggled = false;
    
    userChecksRadio[event.target.id] = !event.target.checked; // toggle checked value of radio button
    groupChosen[event.target.name] = !event.target.checked; // say that a filter radio group has been chosen

    switch(selectedCheckbox) {
      case 'Asian':
        categoryToSwitch = 'byEthnicity';
        getOpposite['byEthnicity'] = false;
        break;
      case 'Non-Asian':
        categoryToSwitch = 'byEthnicity';
        getOpposite['byEthnicity'] = true;
        break;
      case 'Count by Person':
        countByToggled = true;
        countByPerson = true;
        toggleSubCategoryAnimation();
        break;
      case 'Count by Instance':
        countByToggled = true;
        countByPerson = false;
        toggleSubCategoryAnimation();
        break;
      case 'Income Under $80K':
        categoryToSwitch = 'byIncome';
        getOpposite['byIncome'] = false;
        break;
      case 'Income $80K+':
        categoryToSwitch = 'byIncome';
        getOpposite['byIncome'] = true;
        break;
      case 'Care Receiver Under 30':
        categoryToSwitch = 'byCareReceiverAge';
        getOpposite['byCareReceiverAge'] = false;
        break;
      case 'Care Receiver 30+':
        categoryToSwitch = 'byCareReceiverAge';
        getOpposite['byCareReceiverAge'] = true;
        break;
    }
    toSwitch.push(categoryToSwitch);

    if (!countByToggled) {
      var names = ['byEthnicity', 'byIncome', 'byCareReceiverAge'];

      for (var name of names) {
        filters[name] = !!groupChosen[name];
      }
    }

    filterEachRect(getOpposite);
    countByToggled && toggleCountByDisplay();
    toggleCountDisplay();
    toggleSubCategoriesDisplay();
    !countByToggled && toggleBinaryAnimation();
  }

  // Count a person if they fulfill all selected filters
  function allFiltersTrueForPerson(person, getOpposite) {
    var countMapper = {
        byEthnicity: 'asian',
        byIncome: 'income_under_80',
        byCareReceiverAge: 'receiver_under_30'
      },
      filtersToCheck = [];
    for (filter of Object.keys(filters)) {
      filters[filter] && filtersToCheck.push(filter);
    }
    for (filter of filtersToCheck) {
      if (getOpposite[filter] ? person[countMapper[filter]] : !person[countMapper[filter]]) { // person not characterized by this filter, no person should not be counted
        return false;
      }
    }
    return true;
  }

  // Returns true if no filters selected
  function noFiltersOn() {
    for (filter of Object.keys(filters)) {
      if (filters[filter]) {
        return false;
      }
    }
    return true;
  }

  // Calculate counts shown in each rectangle given filters selected
  function filterEachRect(getOpposite) {
    for (var type of ['negative', 'positive']) {
      for (rect of sortedRects[type]) {
        var tempCount = 0;
        if (noFiltersOn()) {
          tempCount = countByPerson ? rect.id_list.length : rect.count;
        } else {
          for (person of rect.id_list) {
            var rectPerson = correlation[person];
            if (countByPerson) {
              if (allFiltersTrueForPerson(rectPerson, getOpposite)) {
                tempCount++;
              }
            } else {
              if (allFiltersTrueForPerson(rectPerson, getOpposite)) {
                tempCount += rectPerson[type][rect.category];
              }
            }
          }
        }
        rect.tempCount = tempCount;
      }
    }
  }

  // Updates the rectangle heights based on count by status
  function toggleCountByDisplay() {
    var mainAndSubRects = d3.selectAll('.mainRect, .subRect'),
      correlatedRects = d3.selectAll('.correlatedRect'),
      colTexts = d3.selectAll('.colText');

    mainAndSubRects.transition()
      .duration(500)
      .attr('height', function(d) {
        return countByPerson ? 
          d.id_list.length * boxHeightByPerson : 
          d.count * boxHeightByInstance;
      })
      .attr('y', function(d) {
        return countByPerson ? d.yByPerson : d.y;
      })

    correlatedRects.transition()
      .duration(500)
      .attr('height', function(d) {
        if (filterClicked) {
          return d.tempCount * (countByPerson ? boxHeightByPerson : boxHeightByInstance);
        }
        return (countByPerson ? 
          d.id_list.length * boxHeightByPerson : 
          d.count * boxHeightByInstance)
          - BIG_STROKE;
      })
      .attr('y', function(d) {
        return (countByPerson ? d.yByPerson : d.y) + BIG_STROKE/2;
      })

    colTexts.transition()
      .duration(500)
      .attr('y', function(d) {
        return (countByPerson ? d.yByPerson : d.y) + 20;
      })
  }

  // Sets filterClicked if any filter is on
  function anyFilterClicked() {
    for (filterVal of Object.values(filters)) {
      if (filterVal) {
        filterClicked = true;
        return;
      }
    }
    filterClicked = false;
  }

  // Rectangle text displays based on mode (correlation/filters)
  function toggleCountDisplay() {
    var colText = d3.selectAll('.colText'),
      subText = d3.selectAll('.subNegative, .subPositive');

    anyFilterClicked();

    const myTimeout = setTimeout(function() {
      colText
        .text(function(d) {
          var numerator = d.tempCount === undefined ? d.id_list.length : d.tempCount // tempCount = undefined at start, so set to person count for initial click-off
            denominator = countByPerson ? d.id_list.length : d.count,
            displayContent = capitalize(d.category + ' (' + numerator + ')');
          if (rectClicked) {
            if (rectClicked.__data__ == d) {
              displayContent = capitalize(d.category); // clicked rectangle just shows category name (ex: 'Love and belonging')
            } else {
              displayContent = capitalize(d.category + ' (' + (countByPerson ? d.correlatedCountByPerson : d.correlatedCount) + ')'); // other rectangles in correlation mode show count (ex: 'Safety (51)')
            }
          } else if (filterClicked) {
            displayContent = capitalize(d.category + ' (' + numerator + '/' + denominator + '): ') + Math.round(numerator / denominator * 100) + '%'; // filter mode shows percentages (ex: 'Esteem (12/58): 21%')
          } else { // return to initial state (ex: 'Love and belonging (79)')
            displayContent = capitalize(d.category + ' (' + denominator + ')');
          }
          return displayContent;
        })
    }, 150);

    const myTimeout2 = setTimeout(function() {
      subText
        .text(function(d) {
            var toDisplay = countByPerson ? (d.otherCount || d.id_list.length) : d.count,  // TODO: change to tempCount!
            displayContent = capitalize(d.subCategory + ' (' + toDisplay + ')');
          return displayContent;
        })
        .call(wrap, 230)
    }, 150);
  }

  // Show animation for simple binary
  function toggleBinaryAnimation() {
    var mainRects = d3.selectAll('.mainRect'),
      corrRects = d3.selectAll('.correlatedRect');

    mainRects.transition()
      .duration(500)
      .style('opacity', 0.2)

    corrRects.transition()
      .duration(1000)
      .attr('height', function(d) {
        return d.tempCount * (countByPerson ? boxHeightByPerson : boxHeightByInstance) - BIG_STROKE;
      })
  }

  // Show animation for switching between count by instance and count by person
  function toggleSubCategoryAnimation() {
    var lines = d3.selectAll('.subNegativeLine, .subPositiveLine'),
      text = d3.selectAll('.subNegative, .subPositive');

    text
      .style('opacity', 0)
      .attr('y', function(d) {
        return (countByPerson ? d.yByPerson : d.y) + 16;
      })
      .transition()
      .delay(200)
      .style('opacity', 1)

    lines
      .attr('y1', function(d) {
        return countByPerson ? d.yByPerson : d.y;
      })
      .attr('y2', function(d) {
        return countByPerson ? d.yByPerson : d.y;
      })
    }

  // Show or obscure subcategories
  function toggleSubCategoriesDisplay() {
    var subcats = d3.selectAll('#negativeColSub, #positiveColSub');

    subcats.transition()
      .duration(500)
      .style('opacity', function(d) {
        return filterClicked ? 0.2 : 1;
      })
  }

  // CLICKING OFF THE DIAGRAM
  d3.select('body').on('click', function(e) {
    returnToInitialVisualState(e);
  });

}) // END of d3.csv.then()
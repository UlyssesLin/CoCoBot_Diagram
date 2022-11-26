// Ulysses Lin
// CoCoBot diagram prototype

// The svg
var svg = d3.select("#diagram"),
  heatmap = d3.select('#heatmap');

  // ------------------------------------------------------------------------------------COCOBOT

var clicked = false,
  countByPerson = true,
  rectClicked,
  filterClicked = false,
  emotions = ['ambiguous', 'negative', 'positive'],
  subNegativeRects = [],
  subPositiveRects = [],
  filters = {
    byEthnicity: false,
    byIncome: false,
    byCareReceiverAge: false
  },
  asianCategory = [
    'asian', 'asian - chinese', 'asian indian', 'chinese', 'japanese', 'korean', 'pacific islander and south asian', 'other: asian/ caucasian'
  ],
  // maps subcategory to category
  // ex: subcategory 'partner+issues' maps to category 'love and belonging'
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
    'Negative from others': 'love and belonging',
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
  COL_WIDTH = 250,
  INIT_Y = 100,
  BOTTOM_MARGIN = 100,
  LABEL_Y = 50,
  ROUNDED_EDGE = 8;
  BIG_STROKE = 8,
  SVG_HEIGHT = 2000,
  HEATMAP_BOX_HEIGHT = 100,
  HEATMAP_BOX_WIDTH = 100,
  INCOME_THRESHHOLD = 80000,
  HEATMAP_BUCKET_1_MAX = 10,
  HEATMAP_BUCKET_2_MAX = 20,
  TOP_COUNT = 5; // # of top categories to display

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function showCount(count) {
  return count === 1 ? '' : ' (' + count + ')';
}

function checkID(id) {
  return id != 'tester' && id.length === 4;
}

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




d3.csv('https://raw.githubusercontent.com/UlyssesLin/CoCoBot_Diagram/master/all_data_old.csv').then(function(data) {
  var topY = INIT_Y,
    topYByPerson = INIT_Y;

  var labels = d3.select('#diagram_inputs')
      .selectAll()
      .data(['Asian', 'Count by Person', 'Income Under $80K', 'Care Receiver Under 30'])
      .enter()
      .append('label');

  labels.append('input')
      .attr('type', 'checkbox')
      .attr('class', function(d) { return 'checkbox ' + d.toLowerCase().split(' ').join('_'); })
      .property('checked', function(d) { return d === 'Count by Person'; })
      .attr('name', function(d) { return d; })
      .attr('value', function(d) { return d.toLowerCase(); })
      // .style('accent-color', function(d) { return colors[d.toLowerCase()]; })
      .on('change', change)
  
  labels.append('span')
      .text(function(d) { return d; })

  // Parse the raw data
  // Sift out Ambiguous, group items by emotion
  for (row in data) {
    var thisRow = data[row],
      thisEmotion;

    // if (thisEmotion === '' && thisRow.Labels === '' && thisRow.Example === '') {
    if (thisRow.Emotion === 'END') {
      break;
    }
    if (!!thisRow.Emotion && emotions.includes(thisRow.Emotion.trim().toLowerCase())) {
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
        // if (lowerCaselabels === "other's health") {
        //   lowerCaselabels = 'others health';
        // }
        if (!!emotionMapper[subCategory]) {
          category = emotionMapper[subCategory];
        } else {
          category = 'other';
        }
        // var splitted = thisRow.Labels.split('+');
        // category = splitted[0].trim();

        // Category
        if (emotionList[thisEmotion][category]) { // category already exists in this emotion
          emotionList[thisEmotion][category].count++;
          // if (thisRow.Asian_Count === 'X') {
          //   emotionList[thisEmotion][category].asian_count++;
          // }
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
        thisEmotion != 'ambiguous' && addID(thisRow.ID_NO, thisEmotion, category);
        thisEmotion != 'ambiguous' && addCategoryID(emotionList[thisEmotion][category].id_list, thisRow.ID_NO);

        // Subcategory
        // if (thisEmotion != 'ambiguous' && !!splitted[1]) {
        if (thisEmotion != 'ambiguous' && subCategory) {
          var subList = emotionList[thisEmotion][category].subCategories;

          // subCategory = splitted[1].trim();
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
    } else {
      console.log('Not an emotion: ' + thisRow.emotion);
    }
  }
  
  for (var type of ['negative', 'positive']) {
    for (category in emotionList[type]) {
      cols[type].push(emotionList[type][category]);
    }
    cols[type].sort(function(a, b) {
      return a.count - b.count;
    }).reverse();
    cols[type].splice(5, cols[type].length - 5);
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

  // Subcategories: TODO: logic for cutting off for Other is very poor
  // Sorting and text logic for subcategories
  for (var type of ['negative', 'positive']) {
    for (var category in sortedRects[type]) {
      var subs = sortedRects[type][category].subCategories,
        currCategory = sortedRects[type][category].category;

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
          // the cutoff should be a little over the px height of text OR cutoff if long text
          // if (tempSorter[n].count * boxHeight < 20 || (tempSorter[n].subCategory.length + tempSorter[n].count.toString().length > 27 && tempSorter[n].count * boxHeight < 40)) {
          //   tempSorter[n - 1].subCategory = 'Other';
          //   otherN = n - 1;
          //   break;
          // }
          if (tempSorter[n].count * boxHeightByInstance < 20 || (tempSorter[n].subCategory.length + tempSorter[n].count.toString().length > 27 && tempSorter[n].count * boxHeightByInstance < 40)) {
            tempSorter[n - 1].subCategory = 'Other';
            otherN = n - 1;
            break;
          }
        }
        if (otherN > -1) {
          for (var i = otherN; i < tempSorter.length; i++) {
            count += tempSorter[i].count;
          }
          tempSorter[otherN].count = count;
          tempSorter.length = otherN + 1;
        }
        topY = sortedRects[type][category].y;
        topYByPerson = sortedRects[type][category].yByPerson;
        var totalInstanceCounts = 0,
          totalPersonCounts = 0;
        for (var subcat of tempSorter) {
          totalPersonCounts += subcat.id_list.length;
          totalInstanceCounts += subcat.count;
        }

        for (var n = 0; n < tempSorter.length; n++) {
          temp = topY;
          tempByPerson = topYByPerson;
          topY += (tempSorter[n].count * boxHeightByInstance);
          topYByPerson += (tempSorter[n].id_list.length / totalPersonCounts) * sortedRects[type][category].id_list.length * boxHeight;
          // topYByPerson += tempSorter[n].id_list.length * boxHeightByPerson;
          tempSorter[n].y = temp;
          tempSorter[n].yByPerson = tempByPerson;
        }
        sortedRects['sub' + capitalize(type)] = sortedRects['sub' + capitalize(type)].concat(tempSorter);
      }
    }
  }



  // User List
  var userListArray = [];
  for (var [key, value] of Object.entries(correlation)) {
    userListArray.push(key);
  }

  function mapEmployment(rawEmployment) {
    var mapper = {
      'full time': 'full time',
      'full-time': 'full time',
      'full time employed': 'full time',
      'full time work': 'full time',
      'full time worker': 'full time',
      'full-time unpaid caregive': 'full time',
      'employed': 'full time',
      'employed full-time': 'full time',
      'ft': 'full time',
      'work full time': 'full time',
      'work fulltime': 'full time',
      'work full-time': 'full time',
      'working .8 fte': 'full time',
      'working full time': 'full time',
      'working full-time': 'full time',
      'working full-time and caregiving': 'full time',
      'employed part time': 'part time',
      '2 part time jobs & homeschool': 'part time',
      'part time': 'part time',
      'part time employed': 'part time',
      'part time worker': 'part time',
      'part-time self employed, part-time employed elsewhere': 'part time',
      'working half-time': 'part time',
      'working part time': 'part time',
      'working part-time': 'part time'
    };
    return mapper[rawEmployment] || 'other';
  }

  d3.csv('https://raw.githubusercontent.com/UlyssesLin/CoCoBot_Diagram/master/coco-demographics.csv').then(function(data) {
    for (var csvPerson of data) {
      if (correlation[csvPerson.Id]) {
        var correlationPerson = correlation[csvPerson.Id];
  
        correlationPerson.asian = asianCategory.includes(csvPerson.Ethnicity.toLowerCase().trim());
        correlationPerson.income_under_80 = under80K(csvPerson.Income);
        correlationPerson.receiver_under_30 = csvPerson.Receiver_age < 30;
        correlationPerson.employment = mapEmployment(csvPerson.Employment.toLowerCase().trim());
      }
    }

    var totalHeatmapCountsByEmployment = {
      'full time': 0,
      'part time': 0,
      'other': 0
    };

    function getEmotionPercents() {
      for (var categoryRect of sortedRects.negative.concat(sortedRects.positive)) {
        if (!categoryRect.heatmapCounts) {
          categoryRect.heatmapCounts = {
            'full time': 0,
            'part time': 0,
            'other': 0
          };
        }
        for (var id of categoryRect.id_list) {
          var person_employment = correlation[id].employment;
          categoryRect.heatmapCounts[person_employment]++;
          totalHeatmapCountsByEmployment[person_employment]++;
        }
  
      }
      for (var categoryRect of sortedRects.negative.concat(sortedRects.positive)) {
        for (var employment of ['full time', 'part time', 'other']) {
          categoryRect.heatmapCounts[employment] = Math.round(categoryRect.heatmapCounts[employment] * 100 / totalHeatmapCountsByEmployment[employment]);
        }
      }
    }
  
    var emotionLabelY = 100;
  
    for (var emotionLabel of sortedRects.negative.concat(sortedRects.positive)) {
      emotionLabel.emotionLabelY = emotionLabelY;
      emotionLabelY += HEATMAP_BOX_HEIGHT;
      // emotionLabel.heatmapCounts = getEmploymentCount(emotionLabel);
    }
    
    getEmotionPercents();


    // Heatmap
  heatmap.append('g')
  .attr('id', 'heatmapDiagram')

  heatmap.select('#heatmapDiagram')
    .append('g')
    .attr('id', 'emotionLabels')

  heatmap.select('#heatmapDiagram')
    .append('g')
    .attr('id', 'topLabels')
    
  heatmap.select('#heatmapDiagram')
    .append('g')
    .attr('id', 'fullTimeCol')

  heatmap.select('#heatmapDiagram')
    .append('g')
    .attr('id', 'partTimeCol')

  heatmap.select('#heatmapDiagram')
    .append('g')
    .attr('id', 'otherTimeCol')



    
  // Heatmap
  var emotionLabels = heatmap.select('#emotionLabels')
    .selectAll('path')
    .data(sortedRects.negative.concat(sortedRects.positive))
    .enter()
    .append('g')
    .attr('width', 100)

  var fullTime = heatmap.select('#fullTimeCol')
    .selectAll('path')
    .data(sortedRects.negative.concat(sortedRects.positive))
    .enter()
    .append('g')
    .attr('width', 100)

  var partTime = heatmap.select('#partTimeCol')
    .selectAll('path')
    .data(sortedRects.negative.concat(sortedRects.positive))
    .enter()
    .append('g')
    .attr('width', 100)

  var otherTime = heatmap.select('#otherTimeCol')
    .selectAll('path')
    .data(sortedRects.negative.concat(sortedRects.positive))
    .enter()
    .append('g')
    .attr('width', 100)


  heatmap.select("#topLabels")
    .append('text')
    .style('font-size', '16px')
    .style('text-anchor', 'middle')
    .attr('x', 570)
    .attr('y', 35)
    .style('font-weight', 600)
    .attr('fill', 'black')
    .text('Full')

  heatmap.select("#topLabels")
    .append('text')
    .style('font-size', '16px')
    .style('text-anchor', 'middle')
    .attr('x', 670)
    .attr('y', 35)
    .style('font-weight', 600)
    .attr('fill', 'black')
    .text('Part')

  heatmap.select("#topLabels")
    .append('text')
    .style('font-size', '16px')
    .style('text-anchor', 'middle')
    .attr('x', 770)
    .attr('y', 35)
    .style('font-weight', 600)
    .attr('fill', 'black')
    .text('Other')



  // HEATMAP DISPLAY
  emotionLabels
    .append('text')
    .attr('id', function(d) {
      return d.emotion + '_' + d.category + '_heatmap';
    })
    .attr('class', 'heatmapLabel')
    .style('font-size', '16px')
    .attr('x', 475)
    .attr('y', function(d) {
      return d.emotionLabelY;
    })
    .style('font-weight', 900)
    .attr('fill', function(d) {
      return d.emotion === 'negative' ? '#5bd1d7' : '#2ECC71';
    })
    .text(function(d) { return capitalize(d.emotion) + ': ' + capitalize(d.category); })
    .style('text-anchor', 'end')
    .append('tspan')
    .text(function(d) { return showCount(d.id_list.length); })

  fullTime
    .append('rect')
    .attr('class', function(d) { return 'fullTimeBox_' + d.emotion + '_' + d.category; })
    .attr('x', 520)
    .attr('y', function(d) {
      return d.emotionLabelY - 50;
    })
    .attr('width', HEATMAP_BOX_WIDTH)
    .attr('height', function(d) {
      return 100;
    })
    // .attr('rx', ROUNDED_EDGE)
    .style('fill', function(d) {
      var color;
      if (d.heatmapCounts['full time'] < HEATMAP_BUCKET_1_MAX) {
        color = '#FCBF49';
      } else if (d.heatmapCounts['full time'] < HEATMAP_BUCKET_2_MAX) {
        color = '#F77F00';
      } else {
        color = '#D62828';
      }
      return color;
    })
    .style('opacity', 1)
    .attr('stroke', 'white')
    .attr('stroke-width', BIG_STROKE)

  fullTime
    .append('text')
    .style('font-size', '16px')
    .attr('x', 570)
    .attr('y', function(d) {
      return d.emotionLabelY + 5;
    })
    .style('font-weight', 900)
    .attr('fill', 'white')
    .text(function(d) { return d.heatmapCounts['full time'] + '%'; })
    .style('text-anchor', 'middle')

  partTime
    .append('rect')
    .attr('class', function(d) { return 'partTimeBox_' + d.emotion + '_' + d.category; })
    .attr('x', 620)
    .attr('y', function(d) {
      return d.emotionLabelY - 50;
    })
    .attr('width', HEATMAP_BOX_WIDTH)
    .attr('height', function(d) {
      return 100;
    })
    // .attr('rx', ROUNDED_EDGE)
    .style('fill', function(d) {
      var color;
      if (d.heatmapCounts['part time'] < HEATMAP_BUCKET_1_MAX) {
        color = '#FCBF49';
      } else if (d.heatmapCounts['part time'] < HEATMAP_BUCKET_2_MAX) {
        color = '#F77F00';
      } else {
        color = '#D62828';
      }
      return color;
    })
    .style('opacity', 1)
    .attr('stroke', 'white')
    .attr('stroke-width', BIG_STROKE)

  partTime
    .append('text')
    .style('font-size', '16px')
    .attr('x', 670)
    .attr('y', function(d) {
      return d.emotionLabelY + 5;
    })
    .style('font-weight', 900)
    .attr('fill', 'white')
    .text(function(d) { return d.heatmapCounts['part time'] + '%'; })
    .style('text-anchor', 'middle')

  otherTime
    .append('rect')
    .attr('class', function(d) { return 'otherTimeBox_' + d.emotion + '_' + d.category; })
    .attr('x', 720)
    .attr('y', function(d) {
      return d.emotionLabelY - 50;
    })
    .attr('width', HEATMAP_BOX_WIDTH)
    .attr('height', function(d) {
      return 100;
    })
    // .attr('rx', ROUNDED_EDGE)
    .style('fill', function(d) {
      var color;
      if (d.heatmapCounts['other'] < HEATMAP_BUCKET_1_MAX) {
        color = '#FCBF49';
      } else if (d.heatmapCounts['other'] < HEATMAP_BUCKET_2_MAX) {
        color = '#F77F00';
      } else {
        color = '#D62828';
      }
      return color;
    })
    .style('opacity', 1)
    .attr('stroke', 'white')
    .attr('stroke-width', BIG_STROKE)

  otherTime
    .append('text')
    .style('font-size', '16px')
    .attr('x', 770)
    .attr('y', function(d) {
      return d.emotionLabelY + 5;
    })
    .style('font-weight', 900)
    .attr('fill', 'white')
    .text(function(d) { return d.heatmapCounts['other'] + '%'; })
    .style('text-anchor', 'middle')

  });


  console.log('correlation', correlation);
  console.log('emotionList', emotionList);
  console.log('cols.subNegative', cols.subNegative);
  console.log('cols.subPositive', cols.subPositive);
  console.log('cols.negative', cols.negative);
  console.log('cols.positive', cols.positive);
  console.log('rects.negative', rects.negative);
  console.log('rects.positive', rects.positive);
  console.log('sortedRects.negative', sortedRects.negative);
  console.log('sortedRects.positive', sortedRects.positive);
  console.log('sortedRects.subNegative', sortedRects.subNegative);
  console.log('sortedRects.subPositive', sortedRects.subPositive);

  

  svg.append('g')
    .attr('id', 'coCoBotDiagram')

  svg.select('#coCoBotDiagram')
    .append('g')
    .attr('id', 'negativeColSub')

  svg.select('#coCoBotDiagram')
    .append('g')
    .attr('id', 'negativeCol')

  svg.select('#coCoBotDiagram')
    .append('g')
    .attr('id', 'correlatedNegativeCol')

  svg.select('#coCoBotDiagram')
    .append('g')
    .attr('id', 'positiveCol')

  svg.select('#coCoBotDiagram')
    .append('g')
    .attr('id', 'positiveColSub')

  // d3.select('#dropdown_container')
  //   .append('select')
  //   .attr('name', 'userList')
  //   .attr('id', 'userList')

  

  // var userList = d3.select('#userList')
  //     .selectAll()
  //     .data(userListArray)
  //     .enter()
  //     .append('option')
  //     .attr('value', function(d) { return d; })
  //     .text(function(d) { return d; })

  // d3.select('#userList').on('change', function() { console.log('changed userList item!'); })

  var subNegativeRectangles = svg.select('#negativeColSub')
    .selectAll('path')
    .data(sortedRects.negative)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH);

  var subNegatives = svg.select('#negativeColSub')
    .selectAll('path')
    .data(sortedRects.subNegative)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH);

  var negatives = svg.select('#negativeCol')
    .selectAll('path')
    .data(sortedRects.negative)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH)
    .on('click', animateCorrelation)

  var correlatedNegatives = svg.select('#correlatedNegativeCol')
    .selectAll('path')
    .data(sortedRects.negative)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH);

  var positives = svg.select('#positiveCol')
    .selectAll('path')
    .data(sortedRects.positive)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH)
    .on('click', animateCorrelation)

  var correlatedPositives = svg.select('#correlatedPositiveCol')
    .selectAll('path')
    .data(sortedRects.positive)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH);

  var subPositiveRectangles = svg.select('#positiveColSub') // note: rects must come before text/lines
    .selectAll('path')
    .data(sortedRects.positive)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH);
    
  var subPositives = svg.select('#positiveColSub')
    .selectAll('path')
    .data(sortedRects.subPositive)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH);


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
      // return Object.keys(d.subCategories).length == 0 ? 0 : d.count * boxHeight;
      return (countByPerson ? d.id_list.length : d.count) * boxHeight;
    })
    .attr('rx', ROUNDED_EDGE)
    .style('fill', '#5bd1d7')
    .style('opacity', 0.5)
    .attr('stroke', 'white')
    .attr('stroke-width', BIG_STROKE)

  // Negative Subcategory Column Text
  subNegatives
    .append('text')
    .attr('class', 'subNegative')
    .style('font-size', '16px')
    .attr('x', 340)
    .attr('y', function(d) {
      return d.yByPerson + 20;
    })
    .style('font-weight', 600)
    .attr('fill', '#17223b')
    .text(function(d) {
      return capitalize(d.subCategory) + ' ' + showCount(d.id_list.length);
    })
    .style('text-anchor', 'end')
    .style('border', 'white')
    .call(wrap, 230)
    // .append('tspan')
    // .text(function(d) { return showCount(d.count); })

  // Negative Subcategory Border Lines
  subNegatives
    .append("line")
      .attr('class', 'subNegativeLine')
      .attr("x1", 100)
      .attr("x2", 350)
      .attr("y1", function(d) { return d.yByPerson; })
      .attr("y2", function(d) { return d.yByPerson; })
      .attr("stroke", "white")
      .attr("stroke-width", "2px")

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
    .style('fill', '#5bd1d7')
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
    .attr('height', function(d) {
      return 0;
      // return d.correlatedCount * boxHeight;
    })
    .attr('rx', ROUNDED_EDGE)
    .style('fill', '#5bd1d7')
    .style('opacity', 1)
    // .attr('stroke', 'white')
    // .attr('stroke-width', BIG_STROKE)

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
      // return d.y + 20;
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
    .style('fill', '#2ECC71')
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
      // return d.y + BIG_STROKE / 2;
      return (countByPerson ? d.yByPerson : d.y) + BIG_STROKE / 2;
    })
    .attr('width', COL_WIDTH - BIG_STROKE)
    .attr('height', function(d) {
      return 0;
      // return d.correlatedCount * boxHeight;
    })
    .attr('rx', ROUNDED_EDGE)
    .style('fill', '#2ECC71')
    .style('opacity', 1)
  //   .transition()
  // .duration(2000)
    // .attr('stroke', 'white')
    // .attr('stroke-width', BIG_STROKE)

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
      // return d.y + 20;
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
    .style('fill', '#2ECC71')
    .style('opacity', 0.5)
    .attr('stroke', 'white')
    .attr('stroke-width', BIG_STROKE)
  
  // Positive Subcategory Column Text
  subPositives
    .append('text')
    .attr('class', 'subPositive')
    .style('font-size', '16px')
    .attr('x', 880)
    .attr('y', function(d) {
      // return d.yByPerson + 20;
      return (countByPerson ? d.yByPerson : d.y) + 20;
    })
    .style('font-weight', 600)
    .attr('fill', '#17223b')
    .text(function(d) { 
      return capitalize(d.subCategory) + ' ' + showCount(d.id_list.length);
    })
    .style('text-anchor', 'start')
    .style('border', 'white')
    .call(wrap, 230)
    // .append('tspan')
    // .text(function(d) { return showCount(d.count); })
  
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


    

  // ANIMATION
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

  function rectClick(a, b) {
    if (!filterClicked) {
      clicked = true;
      rectClicked = this;
      d3.select(this)
        .attr('stroke', 'black')
        .attr('stroke-width', BIG_STROKE)
        // .style('opacity', 1)
        // .style('fill', '#F535AA')
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
  


  // SHOW CORRELATION ANIMATION
  function animateCorrelation(a, b) {
    if (!filterClicked) {
      var mainRects = d3.selectAll('.mainRect:not(.' + b.emotion + 'Rect_' + b.category + ')'),
        corrRects = d3.selectAll('.correlatedRect'),
        colText = d3.selectAll('.colText:not(#' + b.emotion + '_' + b.category + ')');

      // toggleCorrelationMode();
      // toggleCountTypeInSortedRects();
      getGroupCorrelated(b.emotion, b.category);

      mainRects.transition()
        .duration(500)
        .style('opacity', 0.2)

      corrRects.transition()
        .duration(1500)
        .attr('height', function(d) {
          // var toMultiply = countByPerson ? 
          //   (d.correlatedCountByPerson / d.id_list.length) * d.count : 
          //   d.correlatedCount;
          // return toMultiply * boxHeight;
          return countByPerson ? 
            d.correlatedCountByPerson * boxHeightByPerson : 
            d.correlatedCount * boxHeightByInstance;
        })

      toggleCountDisplay();
    }
  }

  function thisRect(type, i, ctype, ci) {
    return type === ctype && i === ci;
  }

  function getGroupCorrelated(selected_emotion, selected_category) {
    // if sortedRects['negative'][0]
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

  // CLICKING OFF THE WHEEL
d3.select('body').on('click', function(e) {
  returnToInitialVisualState(e);
});

function returnToInitialVisualState(e) {
  if (e && e.target) {
    triggersEvent = Array.from(e.target.classList).some(function(toCheck) {
        return ['mainRect', 'subRect', 'checkbox', 'correlatedRect'].includes(toCheck);
    });
  } else {
    triggersEvent = false;
  }
  if (!triggersEvent) { // reset visuals (rects are at full height and opacity)
    clicked = false;
    var mainRects = d3.selectAll('.mainRect'),
    corrRects = d3.selectAll('.correlatedRect'),
    colText = d3.selectAll('.colText');

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
      .attr('height', function(d) {
        return 0;
      })

    toggleCountDisplay();
  }
};

function change(region) {
  var selectedCheckbox = region.target.__data__,
    toSwitch = [],
    categoryToSwitch,
    countByToggled = false;

  switch(selectedCheckbox) {
    case 'Asian':
      categoryToSwitch = 'byEthnicity';
      break;
    case 'Count by Person':
      countByToggled = true;
      countByPerson = !countByPerson;
      // toggleCountTypeInSortedRects();
      toggleSubCategoryAnimation();
      break;
    case 'Income Under $80K':
      categoryToSwitch = 'byIncome';
      break;
    case 'Care Receiver Under 30':
      categoryToSwitch = 'byCareReceiverAge';
      break;
  }
  toSwitch.push(categoryToSwitch);

  if (!countByToggled) {
    for (var i of toSwitch) {
      filters[i] = !filters[i];
    }
  }

  filterEachRect();
  countByToggled && toggleCountByDisplay();
  toggleCountDisplay();
  toggleSubCategoriesDisplay();
  !countByToggled && toggleBinaryAnimation(filters[categoryToSwitch]);
}

function allFiltersTrueForPerson(person) {
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
    if (!person[countMapper[filter]]) { // person not characterized by this filter, no person should not be counted
      return false;
    }
  }
  return true; // all filters apply to this person, so count this person
}

function noFiltersOn() {
  for (filter of Object.keys(filters)) {
    if (filters[filter]) {
      return false;
    }
  }
  return true;
}

function filterEachRect() {
  for (var type of ['negative', 'positive']) {
    for (rect of sortedRects[type]) {
      var tempCount = 0;
      if (noFiltersOn()) {
        tempCount = countByPerson ? rect.id_list.length : rect.count;
      } else {
        for (person of rect.id_list) {
          var rectPerson = correlation[person];
          if (countByPerson) {
            if (allFiltersTrueForPerson(rectPerson)) {
              tempCount++;
            }
          } else {
            if (allFiltersTrueForPerson(rectPerson)) {
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
    colTexts = d3.selectAll('.colText'),
    subRects = d3.selectAll('.subRect');

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

  // subRects.transition()
  //   .duration(1000)

}

function anyFilterClicked() {
  for (filterVal of Object.values(filters)) {
    if (filterVal) {
      filterClicked = true;
      return true;
    }
  }
  filterClicked = false;
  return false;
}

// param true if you want to show by person
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
        // if (d.displayFractionMode) {
        if (rectClicked) {
          if (rectClicked.__data__ == d) {
            displayContent = capitalize(d.category);
          } else {
            displayContent = capitalize(d.category + ' (' + (countByPerson ? correlatedCountByPerson : correlatedCount) + ')');
          }
        } else if (filterClicked) {
          displayContent = capitalize(d.category + ' (' + numerator + '/' + denominator + '): ') + Math.round(numerator / denominator * 100) + '%';
        }
        return displayContent;
      })
  }, 150);

  const myTimeout2 = setTimeout(function() {
    subText
      .text(function(d) {
          var toDisplay = countByPerson ? d.id_list.length : d.count,  // TODO: change to tempCount!
          displayContent = capitalize(d.subCategory + ' (' + toDisplay + ')');
        return displayContent;
      })
      .call(wrap, 230)
  }, 150);
}

  // Show animation for simple binary
  function toggleBinaryAnimation(turnOn) {
    var mainRects = d3.selectAll('.mainRect'),
      corrRects = d3.selectAll('.correlatedRect')

    mainRects.transition()
      .duration(500)
      .style('opacity', 0.2)

    // if (turnOn) {
      corrRects.transition()
        .duration(1000)
        .attr('height', function(d) {
          // var toMultiply = countByPerson ? 
          //   (d.tempCount / d.id_list.length) * d.count : 
          //   d.tempCount;
          // return toMultiply * boxHeight;
          return d.tempCount * (countByPerson ? boxHeightByPerson : boxHeightByInstance) - BIG_STROKE;
        })
    // } else {
    //   corrRects.transition()
    //     .duration(1000)
    //     .attr('height', 0)
    // }
  }

  // Show animation for simple binary
  function toggleSubCategoryAnimation() {
    var lines = d3.selectAll('.subNegativeLine, .subPositiveLine'),
      text = d3.selectAll('.subNegative, .subPositive');

    text
      .style('opacity', 0)

    lines
      .attr('y1', function(d) {
        return countByPerson ? d.yByPerson : d.y;
      })
      .attr('y2', function(d) {
        return countByPerson ? d.yByPerson : d.y;
      })

    text
      .attr('y', function(d) {
        return (countByPerson ? d.yByPerson : d.y) + 20;
      })

    text.transition()
      .delay(200)
      .style('opacity', 1)
    }

    function toggleSubCategoriesDisplay() {
      var subcats = d3.selectAll('#negativeColSub, #positiveColSub');

      subcats.transition()
        .duration(500)
        .style('opacity', function(d) {
          return filterClicked ? 0.2 : 1;
        })
    }

    // ---------------------------------------------------------------------------END COCOBOT
      
}) // END of d3.csv.then()
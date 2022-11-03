// Ulysses Lin
// CoCoBot diagram prototype

// The svg
var svg = d3.select("#diagram");

  // ------------------------------------------------------------------------------------COCOBOT

var clicked = false,
  rectClicked,
  emotions = ['ambiguous', 'negative', 'positive'],
  subNegativeRects = [],
  subPositiveRects = [],
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
  COL_WIDTH = 250,
  INIT_Y = 100,
  BOTTOM_MARGIN = 100,
  LABEL_Y = 50,
  ROUNDED_EDGE = 8;
  BIG_STROKE = 8,
  SVG_HEIGHT = 2000,
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





d3.csv('https://raw.githubusercontent.com/UlyssesLin/CoCoBot_Diagram/master/all_data_old.csv').then(function(data) {
  var topY = INIT_Y;

  var labels = d3.select('#diagram_inputs')
      .selectAll()
      .data(['Individual', 'Asian/Non-Asian', 'Count by Person'])
      .enter()
      .append('label');

  labels.append('input')
      .attr('type', 'checkbox')
      .attr('class', 'checkbox')
      .property('checked', false)
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
        var splitted = thisRow.Labels.split('+');
        category = splitted[0].trim();

        // Category
        if (emotionList[thisEmotion][category]) { // category already exists in this emotion
          emotionList[thisEmotion][category].count++;
          if (thisRow.Asian_Count === 'X') {
            emotionList[thisEmotion][category].asian_count++;
          }
        } else { // category does not yet exist, so create
          if (thisEmotion === 'ambiguous') {
            emotionList.ambiguous[category] = {
              category: category.toLowerCase(),
              count: 1,
              asian_count: thisRow.Asian_Count === 'X' ? 1 : 0,
              y: 0,
              id_list: []
            }
          } else {
            emotionList[thisEmotion][category] = {
              emotion: thisEmotion,
              category: category.toLowerCase(),
              subCategories: {},
              count: 1,
              asian_count: thisRow.Asian_Count === 'X' ? 1 : 0,
              y: 0,
              id_list: []
            };
          }
        }
        thisEmotion != 'ambiguous' && addID(thisRow.ID_NO, thisEmotion, category.toLowerCase());
        thisEmotion != 'ambiguous' && addCategoryID(emotionList[thisEmotion][category].id_list, thisRow.ID_NO);

        // Subcategory
        if (thisEmotion != 'ambiguous' && !!splitted[1]) {
          var subList = emotionList[thisEmotion][category].subCategories;

          subCategory = splitted[1].trim();
          if (!!subList[subCategory]) {
            subList[subCategory].count++;
          } else {
            subList[subCategory] = {
              category: category,
              subCategory: subCategory.toLowerCase(),
              count: 1,
              y: 0
            };
          }
        }
      }
    } else {
      console.log('Not an emotion: ' + thisRow.emotion);
    }
  }
  
  // boxHeight = SVG_HEIGHT / (emotionListCounts.negative > emotionListCounts.positive ? emotionListCounts.negative : emotionListCounts.positive);

  for (var type of ['negative', 'positive']) {
    for (category in emotionList[type]) {
      cols[type].push(emotionList[type][category]);
    }
    cols[type].sort(function(a, b) {
      return a.count - b.count;
    }).reverse();
    cols[type].splice(5, cols[type].length - 5);
  }

  // for (var type of ['negative', 'positive']) {
  //   for (var category in cols[type]) {
  //     var subs = cols[type][category].subCategories;

  //     if (!!Object.keys(subs).length) {
  //       var count = 0,
  //         tempSorter = [];
  //       for (var subcat in subs) {
  //         tempSorter.push(subs[subcat]);
  //       }
  //       tempSorter.sort(function(a, b) {
  //         return a.count - b.count;
  //       }).reverse();
  //       for (var i in tempSorter) {
  //         count += tempSorter[i].count;
  //       }
  //       cols['sub' + capitalize(type)] = cols['sub' + capitalize(type)].concat(tempSorter);
  //       if (rects[type].length < TOP_COUNT) {
  //         rects[type].push({
  //           category: cols[type][category].category,
  //           count: count,
  //           y: 0
  //         });
  //       }
  //     }
  //   }
  // }

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
    mismatchedNegCount = 0,
    mismatchedPosCount = 0;
  for (var n = 0; n < TOP_COUNT; n++) {
    var currNeg = sortedRects['negative'][n],
      currPos = sortedRects['positive'][n];

    if (currNeg.category === currPos.category) {
      maxCount += currNeg.count >= currPos.count ? currNeg.count : currPos.count;
    } else {
      mismatchedNegCount += currNeg.count;
      mismatchedPosCount += currPos.count;
    }
  }
  
  maxCount += mismatchedNegCount >= mismatchedPosCount ? mismatchedNegCount : mismatchedPosCount;
  boxHeight = (SVG_HEIGHT - INIT_Y - BOTTOM_MARGIN) / maxCount;

  var lastMatched = -1,
    lastMatchedBottomY;
  // Update y values of sortedRects, allow for vertical spacing
  for (var n = 0; n < TOP_COUNT; n++) {
    var currNeg = sortedRects['negative'][n],
      currPos = sortedRects['positive'][n],
      temp;

    temp = topY;
    // Matching categories need to "level out"
    // (i.e., if one rect is shorter, then give additional white space below
    // until bottom of other rect)
    if (currNeg.category === currPos.category) {
      topY += ((currNeg.count >= currPos.count ? currNeg : currPos).count * boxHeight);
      currNeg.y = temp;
      currPos.y = temp;
      lastMatched = n;
      lastMatchedBottomY = topY;
    } else {
      break;
    }
  }
  // Non-matching categories have y just below previous rect y
  for (var type of ['negative', 'positive']) {
    for (var n = lastMatched + 1; n < TOP_COUNT; n++) {
      temp = topY;
      topY += (sortedRects[type][n].count * boxHeight);
      sortedRects[type][n].y = temp;
    }
    topY = lastMatchedBottomY;
  }

  // Subcategories: TODO: logic for cutting off for Other is very poor
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
          if (tempSorter[n].count * boxHeight < 20) { // the cutoff should be a little over the px height of text
            tempSorter[n - 1].subCategory = 'Other';
            // tempSorter.length = n;
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
        for (var n = 0; n < tempSorter.length; n++) {
          temp = topY;
          topY += (tempSorter[n].count * boxHeight);
          tempSorter[n].y = temp;
          
          // if (tempSorter[n].y + 40 > sortedRects[type][category].y + boxHeight * sortedRects[type][category].count) {
          //   tempSorter[n].subCategory = 'Other'
          // }
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

  d3.select('#dropdown_container')
    .append('select')
    .attr('name', 'userList')
    .attr('id', 'userList')

  var userList = d3.select('#userList')
      .selectAll()
      .data(userListArray)
      .enter()
      .append('option')
      .attr('value', function(d) { return d; })
      .text(function(d) { return d; })

  d3.select('#userList').on('change', function() { console.log('changed userList item!'); })

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
      return d.y;
    })
    .attr('width', COL_WIDTH)
    .attr('height', function(d) {
      return Object.keys(d.subCategories).length == 0 ? 0 : d.count * boxHeight;
    })
    .attr('rx', ROUNDED_EDGE)
    .style('fill', '#5bd1d7')
    .style('opacity', 0.5)
    .attr('stroke', 'white')
    .attr('stroke-width', BIG_STROKE)

  // Negative Subcategory Column Text
  subNegatives
    .append('text')
    .style('font-size', '16px')
    .attr('x', 340)
    .attr('y', function(d) {
      return d.y + 20;
    })
    .style('font-weight', 600)
    .attr('fill', '#17223b')
    .text(function(d) {
      // var matchingSubRect = document.querySelector('.subNegativeRect_' + d.category.replace(/\s/g, '_'));
      // if (d.y + 40 > matchingSubRect.height.baseVal.value + matchingSubRect.y.baseVal.value) {
      //   return '';
      // }
      return capitalize(d.subCategory);
    })
    .style('text-anchor', 'end')
    .style('border', 'white')
    .append('tspan')
    .text(function(d) { return showCount(d.count); })

  // Negative Subcategory Border Lines
  subNegatives
    .append("line")
      .attr("x1", 100)
      .attr("x2", 350)
      .attr("y1", function(d) { return d.y; })
      .attr("y2", function(d) { return d.y; })
      .attr("stroke", "white")
      .attr("stroke-width", "2px")

  // topY = INIT_Y - 20;

  // Negative Column Rectangles
  negatives
    .append('rect')
    .attr('class', function(d) { return 'mainRect negativeRect_' + d.category; })
    .attr('x', 350)
    .attr('y', function(d) {
      return d.y;
    })
    .attr('width', COL_WIDTH)
    .attr('height', function(d) {
      return d.count * boxHeight;
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
      return d.y;
    })
    .attr('width', COL_WIDTH - BIG_STROKE)
    .attr('height', function(d) {
      return 0;
      // return d.correlatedCount * boxHeight;
    })
    .attr('rx', ROUNDED_EDGE)
    .style('fill', '#5bd1d7')
    .style('opacity', 0.8)
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
      return d.y + 20;
    })
    .style('font-weight', 600)
    .attr('fill', 'white')
    .text(function(d) { return capitalize(d.category); })
    .style('text-anchor', 'middle')
    .append('tspan')
    .text(function(d) { return showCount(d.count); })

    topY = INIT_Y - 20;


  // ---------------------POSITIVE---------------------


  // Positive Column Rectangles
  positives
    .append('rect')
    .attr('class', function(d) { return 'mainRect positiveRect_' + d.category; })
    .attr('x', 620)
    .attr('y', function(d) {
      return d.y;
      // var temp = topY;
      // topY += (d.count * boxHeight); 
      // return temp;
    })
    .attr('width', COL_WIDTH)
    .attr('height', function(d) {
      return d.count * boxHeight;
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
      return d.y + BIG_STROKE / 2;
    })
    .attr('width', COL_WIDTH - BIG_STROKE)
    .attr('height', function(d) {
      return 0;
      // return d.correlatedCount * boxHeight;
    })
    .attr('rx', ROUNDED_EDGE)
    .style('fill', '#2ECC71')
    .style('opacity', 0.8)
  //   .transition()
  // .duration(2000)
    // .attr('stroke', 'white')
    // .attr('stroke-width', BIG_STROKE)

  // topY = INIT_Y;

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
      return d.y + 20;
      // var temp = topY;
      // topY += (d.count * boxHeight); 
      // return temp;
    })
    .style('font-weight', 600)
    .attr('fill', 'white')
    .text(function(d) { return capitalize(d.category); })
    .style('text-anchor', 'middle')
    .append('tspan')
    .text(function(d) { return showCount(d.count); })
    
  // Positive Subcategory Column Rectangles
  subPositiveRectangles
    .append('rect')
    .attr('class', function(d) { return 'subRect subPositiveRect_' + d.category; })
    .attr('x', 870)
    .attr('y', function(d) {
      return d.y;
    })
    .attr('width', COL_WIDTH)
    .attr('height', function(d) {
      return d.count * boxHeight;
    })
    .attr('rx', ROUNDED_EDGE)
    .style('fill', '#2ECC71')
    .style('opacity', 0.5)
    .attr('stroke', 'white')
    .attr('stroke-width', BIG_STROKE)
  
  // Positive Subcategory Column Text
  subPositives
    .append('text')
    .style('font-size', '16px')
    .attr('x', 880)
    .attr('y', function(d) {
      return d.y + 20;
    })
    .style('font-weight', 600)
    .attr('fill', '#17223b')
    .text(function(d) { return capitalize(d.subCategory); })
    .style('text-anchor', 'start')
    .style('border', 'white')
    .append('tspan')
    .text(function(d) { return showCount(d.count); })
  
  // Positive Subcategory Border Lines
  subPositives
    .append("line")
    .attr("x1", 870)
    .attr("x2", 1120)
    .attr("y1", function(d) { return d.y; })
    .attr("y2", function(d) { return d.y; })
    .attr("stroke", "white")
    .attr("stroke-width", "2px")




  // ANIMATION
  function rectHover(a, b) {
    if (!clicked) { // only animate hover if no correlation requested
      d3.select(this)
        .transition()
        .duration(100)
        .style('opacity', 0.2)
      d3.select('#' + b.emotion + '_' + b.category)
        .attr('fill', 'black')
    }
  }

  function rectLeave(a, b) {
    if (!clicked) { // only animate hover if no correlation requested
      d3.select(this)
        .transition()
        .duration(100)
        .style('opacity', 1)
      d3.select('#' + b.emotion + '_' + b.category)
        .attr('fill', 'white')
    }
  }

  function rectClick(a, b) {
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
  
  function animateCorrelation(a, b) {
    var mainRects = d3.selectAll('.mainRect:not(.' + b.emotion + 'Rect_' + b.category + ')'),
      corrRects = d3.selectAll('.correlatedRect'),
      colText = d3.selectAll('.colText:not(#' + b.emotion + '_' + b.category + ')');

    getGroupCorrelated(b.emotion, b.category);

    mainRects.transition()
      .duration(500)
      .style('opacity', 0.2)

    corrRects.transition()
      .duration(1500)
      .attr('height', function(d) {
        // return 0;
        return d.correlatedCount * boxHeight;
      })

    const myTimeout = setTimeout(function() {
      colText
        .text(function(d) {
          return capitalize(d.category + '(' + d.correlatedCount + '/' + d.count + '): ') + Math.round(d.correlatedCount / d.count * 100) + '%';
        })
    }, 750);

  }

  function thisRect(type, i, ctype, ci) {
    return type === ctype && i === ci;
  }

  function getGroupCorrelated(selected_emotion, selected_category) {
    // Initialize correlatedCount for each sortedRect
    for (var type of ['negative', 'positive']) {
      for (var i = 0; i < 5; i++) {
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
        return ['mainRect', 'subRect', 'checkbox'].includes(toCheck);
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

    corrRects.transition()
      .duration(1500)
      .attr('height', function(d) {
        return 0;
      })

    colText
      .text(function(d) {
        return capitalize(d.category) + ' (' + d.count + ')';
      })
  }
};

function change(region) {
  if (region.target.__data__ === 'Asian/Non-Asian') {
    if (region.target.checked) {
      clicked = true;
      toggleCorrelationAnimation('ethnic')
    } else {
      clicked = false;
      returnToInitialVisualState();
      // toggleCorrelationAnimation('countByInstance');
    }
  } else if (region.target.__data__ === 'Count by Person') {
    if (region.target.checked) {
      clicked = true;
      // animateCountByPersonStatistics()
      toggleCorrelationAnimation('countByPerson');
    } else {
      clicked = false;
      // returnToInitialVisualState(e);
      toggleCorrelationAnimation('countByInstance');
    }
  }
  // svg.selectAll('.' + region.target.value)
  //     .transition()
  //     .duration(600)
  //     .attr('opacity', region.target.checked ? 1 : 0)
}

  function animateEthnicStatistics() {
    var mainRects = d3.selectAll('.mainRect'),
      corrRects = d3.selectAll('.correlatedRect'),
      colText = d3.selectAll('.colText');

    // getEthnicRects();

    mainRects.transition()
      .duration(500)
      .style('opacity', 0.2)

    corrRects.transition()
      .duration(1500)
      .attr('height', function(d) {
        // return 0;
        return d.asian_count * boxHeight;
      })

    const myTimeout = setTimeout(function() {
      colText
        .text(function(d) {
          return capitalize(d.category + '(' + d.asian_count + '/' + d.count + '): ') + Math.round(d.asian_count / d.count * 100) + '%';
        })
    }, 750);
  }

  // Animate correlation by person (instead of reported instance)
  function toggleCorrelationAnimation(countMethod) {
    var mainRects = d3.selectAll('.mainRect'),
    
    corrRects = d3.selectAll('.correlatedRect'),
      colText = d3.selectAll('.colText');

    mainRects.transition()
    .duration(500)
    .style('opacity', 0.2)
    
    if (countMethod === 'countByPerson') {
      corrRects.transition()
        .duration(1500)
        .attr('height', function(d) {
          return (d.correlatedCountByPerson / d.id_list.length) * d.count * boxHeight;
        })
      const myTimeout = setTimeout(function() {
        colText
          .text(function(d) {
            var numerator = d.correlatedCountByPerson,
              denominator = d.id_list.length;
            return d.clickedRect ? 
              capitalize(d.category + '(' + denominator + ')') :
              capitalize(d.category + '(' + numerator + '/' + denominator + '): ') + Math.round(numerator / denominator * 100) + '%';
          })
      }, 750);
    } else if (countMethod === 'countByInstance') {
      corrRects.transition()
        .duration(1500)
        .attr('height', function(d) {
          return d.correlatedCount * boxHeight;
        })
      const myTimeout = setTimeout(function() {
        colText
          .text(function(d) {
            var numerator = d.correlatedCount,
              denominator = d.count;
              return d.clickedRect ? 
                capitalize(d.category + '(' + denominator + ')') : 
                capitalize(d.category + '(' + numerator + '/' + denominator + '): ') + Math.round(numerator / denominator * 100) + '%';
          })
      }, 750);
    } else if (countMethod === 'ethnic') {
      corrRects.transition()
        .duration(1500)
        .attr('height', function(d) {
          return d.asian_count * boxHeight;
        })
      const myTimeout = setTimeout(function() {
        colText
          .text(function(d) {
            var numerator = d.asian_count,
              denominator = d.count;
              return capitalize(d.category + '(' + numerator + '/' + denominator + '): ') + Math.round(numerator / denominator * 100) + '%';
          })
      }, 750);
    }
  }

    // ---------------------------------------------------------------------------END COCOBOT
      
}) // END of d3.csv.then()
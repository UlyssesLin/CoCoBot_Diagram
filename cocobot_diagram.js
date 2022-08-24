// Ulysses Lin
// CoCoBot diagram prototype

// The svg
var svg = d3.select("#diagram");

  // ------------------------------------------------------------------------------------COCOBOT

var emotions = ['Ambiguous', 'Negative', 'Positive'],
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
  rects = {
    negative: [],
    positive: []
  },
  COL_WIDTH = 200,
  INIT_Y = 100,
  LABEL_Y = 50,
  ROUNDED_EDGE = 8;
  BIG_STROKE = 8;

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function showCount(count) {
  return count === 1 ? '' : ' (' + count + ')';
}

d3.csv('/cocobot_diary_1.csv').then(function(data) {
  var topY = INIT_Y;

  for (row in data) {
    var thisRow = data[row],
      thisEmotion = thisRow.Emotion.toLowerCase();

    if (thisEmotion === '' && thisRow.Labels === '' && thisRow.Example === '') {
      break;
    }
    if (emotions.includes(thisRow.Emotion)) {
      var category = '',
        subCategory = '';

      if (!!thisRow.Labels) {
        var splitted = thisRow.Labels.split('+');
        category = splitted[0].trim();

        // Category
        if (emotionList[thisEmotion][category]) {
          emotionList[thisEmotion][category].count++;
          emotionListCounts[thisEmotion]++;
        } else {
          if (thisEmotion === 'ambiguous') {
            emotionList.ambiguous[category] = {
              category: category.toLowerCase(),
              count: 1,
              y: 0
            }
          } else {
            emotionList[thisEmotion][category] = {
              category: category.toLowerCase(),
              subCategories: {},
              count: 1,
              y: 0
            };
          }
          emotionListCounts[thisEmotion]++;
        }

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
  

  for (var type of ['negative', 'positive']) {
    for (category in emotionList[type]) {
      cols[type].push(emotionList[type][category]);
    }
    cols[type].sort(function(a, b) {
      return a.count - b.count;
    }).reverse();
    for (var c in cols[type]) {
      var sortedCat = cols[type][c],
      
      temp = topY;
      topY += (sortedCat.count * 30); 
      sortedCat.y = temp;
    }
    topY = INIT_Y;
  }

  for (var type of ['negative', 'positive']) {
    for (var category in cols[type]) {
      var subs = cols[type][category].subCategories;

      if (!!Object.keys(subs).length) {
        var count = 0,
          tempSorter = [];
        for (var subcat in subs) {
          tempSorter.push(subs[subcat]);
        }
        tempSorter.sort(function(a, b) {
          return a.count - b.count;
        }).reverse();
        for (var i in tempSorter) {
          tempSorter[i].y = cols[type][category].y + (count * 30);
          count += tempSorter[i].count;
        }
        cols['sub' + capitalize(type)] = cols['sub' + capitalize(type)].concat(tempSorter);
        rects[type].push({
          category: cols[type][category].category,
          count: count,
          y: tempSorter[0].y
        });
      }
    }
  }

  console.log('emotionList', emotionList);
  console.log('cols.subNegative', cols.subNegative);
  console.log('cols.subPositive', cols.subPositive);
  console.log('cols.negative', cols.negative);
  console.log('cols.positive', cols.positive);
  console.log('rects.negative', rects.negative);
  console.log('rects.positive', rects.positive);

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
    .attr('id', 'positiveCol')

  svg.select('#coCoBotDiagram')
    .append('g')
    .attr('id', 'positiveColSub')

  var subNegativeRectangles = svg.select('#negativeColSub')
    .selectAll('path')
    .data(rects.negative)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH);

  var subNegatives = svg.select('#negativeColSub')
    .selectAll('path')
    .data(cols.subNegative)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH);

  var negatives = svg.select('#negativeCol')
    .selectAll('path')
    .data(cols.negative)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH);

  var positives = svg.select('#positiveCol')
    .selectAll('path')
    .data(cols.positive)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH);

  var subPositiveRectangles = svg.select('#positiveColSub')
    .selectAll('path')
    .data(rects.positive)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH);

  var subPositives = svg.select('#positiveColSub')
    .selectAll('path')
    .data(cols.subPositive)
    .enter()
    .append('g')
    .attr('width', COL_WIDTH);

  svg.select("#negativeColSub")
    .append('text')
    .style('font-size', '16px')
    .style('text-anchor', 'middle')
    .attr('x', 200)
    .attr('y', LABEL_Y)
    .style('font-weight', 600)
    .attr('fill', 'black')
    .text('Negative Subcategories')

  svg.select("#negativeCol")
    .append('text')
    .style('font-size', '32px')
    .style('text-anchor', 'middle')
    .attr('x', 400)
    .attr('y', LABEL_Y)
    .style('font-weight', 600)
    .attr('fill', 'black')
    .text('Negative')

  svg.select("#positiveCol")
    .append('text')
    .style('font-size', '32px')
    .style('text-anchor', 'middle')
    .attr('x', 620)
    .attr('y', LABEL_Y)
    .style('font-weight', 600)
    .attr('fill', 'black')
    .text('Positive')

  svg.select("#positiveColSub")
    .append('text')
    .style('font-size', '16px')
    .style('text-anchor', 'middle')
    .attr('x', 830)
    .attr('y', LABEL_Y)
    .style('font-weight', 600)
    .attr('fill', 'black')
    .text('Positive Subcategories')

  // Negative Subcategory Column Rectangles
  subNegativeRectangles
    .append('rect')
    .attr('class', function(d) { return 'positiveRect_' + d.category; })
    .attr('x', 100)
    .attr('y', function(d) {
      return d.y - 20;
    })
    .attr('width', COL_WIDTH)
    .attr('height', function(d) {
      return d.count * 30;
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
    .attr('x', 290)
    .attr('y', function(d) {
      return d.y;
    })
    .style('font-weight', 600)
    .attr('fill', '#17223b')
    .text(function(d) { return capitalize(d.subCategory); })
    .style('text-anchor', 'end')
    .style('border', 'white')
    .append('tspan')
    .text(function(d) { return showCount(d.count); })

  // Negative Subcategory Border Lines
  subNegatives
    .append("line")
      .attr("x1", 100)
      .attr("x2", 300)
      .attr("y1", function(d) { return d.y - 20; })
      .attr("y2", function(d) { return d.y - 20; })
      .attr("stroke", "white")
      .attr("stroke-width", "2px")

  topY = INIT_Y - 20;

  // Negative Column Rectangles
  negatives
    .append('rect')
    .attr('class', function(d) { return 'positiveRect_' + d.category; })
    .attr('x', 300)
    .attr('y', function(d) {
      var temp = topY;
      topY += (d.count * 30); 
      return temp;
    })
    .attr('width', COL_WIDTH)
    .attr('height', function(d) {
      return d.count * 30;
    })
    .attr('rx', ROUNDED_EDGE)
    .style('fill', '#5bd1d7')
    .attr('stroke', 'white')
    .attr('stroke-width', BIG_STROKE)

  topY = INIT_Y;

  // Negative Column Text
  negatives
    .append('text')
    .style('font-size', '16px')
    .attr('x', 400)
    .attr('y', function(d) {
      var temp = topY;
      topY += (d.count * 30); 
      return temp;
    })
    .style('font-weight', 600)
    .attr('fill', '#17223b')
    .text(function(d) { return capitalize(d.category); })
    .style('text-anchor', 'middle')
    .append('tspan')
    .text(function(d) { return showCount(d.count); })

    topY = INIT_Y - 20;


  // ---------------------POSITIVE---------------------


  // Positive Column Rectangles
  positives
    .append('rect')
      .attr('class', function(d) { return 'positiveRect_' + d.category; })
      .attr('x', 520)
      .attr('y', function(d) {
        var temp = topY;
        topY += (d.count * 30); 
        return temp;
      })
      .attr('width', COL_WIDTH)
      .attr('height', function(d) {
        return d.count * 30;
      })
      .attr('rx', ROUNDED_EDGE)
      .style('fill', '#2ECC71')
      .attr('stroke', 'white')
      .attr('stroke-width', BIG_STROKE)

  topY = INIT_Y;

  // Positive Column Text
  positives
    .append('text')
    .attr('class', 'positiveItem')
    .style('font-size', '16px')
    .attr('x', 620)
    .attr('y', function(d) {
      var temp = topY;
      topY += (d.count * 30); 
      return temp;
    })
    .style('font-weight', 600)
    .attr('fill', 'white')
    .text(function(d) { return capitalize(d.category); })
    .style('text-anchor', 'middle')
    .append('tspan')
    .text(function(d) { return showCount(d.count); })

  // Positive Subcategory Column Text
  subPositives
    .append('text')
    .style('font-size', '16px')
    .attr('x', 740)
    .attr('y', function(d) {
      return d.y;
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
      .attr("x1", 730)
      .attr("x2", 930)
      .attr("y1", function(d) { return d.y - 20; })
      .attr("y2", function(d) { return d.y - 20; })
      .attr("stroke", "white")
      .attr("stroke-width", "2px")

  // Positive Subcategory Column Rectangles
  subPositiveRectangles
    .append('rect')
    .attr('class', function(d) { return 'positiveRect_' + d.category; })
    .attr('x', 730)
    .attr('y', function(d) {
      return d.y - 20;
    })
    .attr('width', COL_WIDTH)
    .attr('height', function(d) {
      return d.count * 30;
    })
    .attr('rx', ROUNDED_EDGE)
    .style('fill', '#2ECC71')
    .style('opacity', 0.5)
    .attr('stroke', 'white')
    .attr('stroke-width', BIG_STROKE)


    // ---------------------------------------------------------------------------END COCOBOT
      
}) // END of d3.csv.then()




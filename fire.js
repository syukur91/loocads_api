

module.exports = function(word) {
    fb.once('value', function(snapshot) {
        var data = snapshot.val();
        data.forEach(function(dataSnap) {
            // var index = word.indexOf(' ');
            // var first = dataSnap.Name.substring(0, index);
            // var last = word.substring(index + 1);
            // var candidate = dataSnap.Name;
            // if (candidate.indexOf(first) >= 0 && candidate.indexOf(last) >= 0)
            //   return dataSnap.CID;
              return dataSnap
        });
    });
  }
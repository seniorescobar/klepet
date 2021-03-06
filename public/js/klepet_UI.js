function divElementEnostavniTekst(sporocilo, pocisti) {
  if (pocisti)
    return $('<div style="font-weight: bold"></div>').text(sporocilo);
  else 
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      sistemskoSporocilo = obdelajBesedilo(sistemskoSporocilo);
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = obdelajBesedilo(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo), false);
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    if(sporocilo.besedilo.indexOf(' (zasebno):') > 0 && sporocilo.besedilo.indexOf(':') > sporocilo.besedilo.indexOf(' (zasebno):'))
      sporocilo.besedilo = obdelajBesedilo(sporocilo.besedilo);
    var novElement = divElementEnostavniTekst(sporocilo.besedilo, false);
    $('#sporocila').append(novElement);
  });
  
  socket.on('dregljaj', function (odziv) {
    if(odziv.dregljaj){
      $vsebina = $('#vsebina').jrumble();
      $vsebina.trigger('startRumble');
      setTimeout(function() {
        $vsebina.trigger('stopRumble');
      }, 1500);
    }
    else{
      if(odziv.vzdevek){
        var sporocilo = 'Dregljaj za ' + odziv.vzdevek + '.';
        $('#sporocila').append(divElementEnostavniTekst(sporocilo));
      }
      else{
       var sporocilo = 'Neznan ukaz.';
       $('#sporocila').append(divElementHtmlTekst(sporocilo));
      }
    }
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal), true);
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(
        divElementEnostavniTekst(uporabniki[i], true)
        .click(function(){
          $('#poslji-sporocilo').val('/zasebno ' + '"' + $(this).text() +  '" ').focus();
        })
      );
    }
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});

function pocisti(vhodnoBesedilo){
  return vhodnoBesedilo.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}

function dodajSlike(vhodnoBesedilo){
  var izraz = /https?:\/\/\S*?\.(jpg|png|gif)/g;
  var slike = vhodnoBesedilo.match(izraz);
  
  if(slike !== null)
    for(var i = 0; i<slike.length; i++)
      vhodnoBesedilo += '<img class="slika" src="' + slike[i] + '"/>';
  
  return vhodnoBesedilo;
}

function dodajVidee(vhodnoBesedilo){
  var novoVhodnoBesedilo = vhodnoBesedilo;
  var izraz = /https:\/\/www\.youtube\.com\/watch\?v=(\S+)/g;
  var videi = izraz.exec(vhodnoBesedilo);
  
  while (videi != null) {
      novoVhodnoBesedilo += '<iframe class="video" src="https://www.youtube.com/embed/' + videi[1] + '" allowfullscreen></iframe>';
      videi = izraz.exec(vhodnoBesedilo);
  }
  
  return novoVhodnoBesedilo;
}

function obdelajBesedilo(vhodnoBesedilo){
  vhodnoBesedilo = pocisti(vhodnoBesedilo);
  vhodnoBesedilo = dodajSlike(vhodnoBesedilo);
  vhodnoBesedilo = dodajVidee(vhodnoBesedilo);
  vhodnoBesedilo = dodajSmeske(vhodnoBesedilo);
  vhodnoBesedilo = filtirirajVulgarneBesede(vhodnoBesedilo);
  
  return vhodnoBesedilo;
}
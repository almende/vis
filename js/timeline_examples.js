var selectedMethod = 'jsText';

$('input[name=play_ground_type]').click(function(){
  selectedMethod = $(this).val();
  $('pre').hide();
  $('#' + selectedMethod).show();
  $("#runCodeBtn").click();
});

$('#runCodeBtn').on('click', function(){
  var codeText = $('#' + selectedMethod).text();
  $('#visualization').empty();

  try {
    eval(codeText);
  } catch(err){
    $('#visualization').text(err)
  }
  
})

$('#runCodeBtn').click();

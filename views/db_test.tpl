% include('header.tpl')
<ul>
% for db in databases:
  <li>{{db['name']}} {{db['host']}} {{db['status']}}</li>
% end
</ul>
% include('footer.tpl')
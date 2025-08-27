$base='http://127.0.0.1:5000'
Write-Host "== STARTING E2E TESTS =="

# 1) Login as admin-equivalent (testuser)
try {
  $login = Invoke-RestMethod -Uri "$base/api/login" -Method POST -ContentType 'application/json' -Body '{"username":"testuser","password":"testpass"}'
  $token = $login.token
  Write-Host "LOGIN AS testuser: OK"
} catch {
  Write-Host "LOGIN AS testuser: FAILED -> $_"
  exit 1
}

$hdr = @{ Authorization = "Bearer $token" }

# 2) List users
try {
  $users = Invoke-RestMethod -Uri "$base/api/admin/users" -Method GET -Headers $hdr
  Write-Host "LIST USERS: OK (count: $($users.Count))"
} catch {
  Write-Host "LIST USERS: FAILED -> $_"
}

# 3) Create a temp user
$tempUser = 'e2e_temp_user'
try {
  $body = @'
{
  "username": "{0}",
  "password": "tempPW123",
  "role": "user",
  "full_name": "E2E Temp"
}
'@ -f $tempUser
  $create = Invoke-RestMethod -Uri "$base/api/admin/users" -Method POST -Headers $hdr -ContentType 'application/json' -Body $body
  Write-Host "CREATE user '$tempUser': OK -> $($create | ConvertTo-Json -Compress)"
} catch {
  Write-Host "CREATE user '$tempUser': FAILED -> $_"
}

# 4) Refresh users and find id
try {
  $users = Invoke-RestMethod -Uri "$base/api/admin/users" -Method GET -Headers $hdr
  $new = $users | Where-Object { $_.username -eq $tempUser }
  if ($null -eq $new) { Write-Host "Created user not found in list" } else { Write-Host "Found created user id=$($new.id)" }
} catch {
  Write-Host "REFRESH USERS: FAILED -> $_"
}

# 5) Login as new user
try {
  $login2 = Invoke-RestMethod -Uri "$base/api/login" -Method POST -ContentType 'application/json' -Body "{\"username\":\"$tempUser\",\"password\":\"tempPW123\"}"
  Write-Host "LOGIN as created user: OK"
} catch {
  Write-Host "LOGIN as created user: FAILED -> $_"
}

# 6) Update and reset via admin
if ($new) {
  $id = $new.id
    try {
    $updBody = @'
{ "full_name": "E2E Temp Updated" }
'@
    $up = Invoke-RestMethod -Uri "$base/api/admin/users/$id" -Method PUT -Headers $hdr -ContentType 'application/json' -Body $updBody
    Write-Host "UPDATE user full_name: OK -> $($up | ConvertTo-Json -Compress)"
  } catch {
    Write-Host "UPDATE user: FAILED -> $_"
  }

  try {
    $pwBody = @'
{ "password": "newTempPW456" }
'@
    $pw = Invoke-RestMethod -Uri "$base/api/admin/users/$id" -Method PUT -Headers $hdr -ContentType 'application/json' -Body $pwBody
    Write-Host "RESET password via admin update: OK -> $($pw | ConvertTo-Json -Compress)"
  } catch {
    Write-Host "RESET password: FAILED -> $_"
  }

  try {
    $login3 = Invoke-RestMethod -Uri "$base/api/login" -Method POST -ContentType 'application/json' -Body "{\"username\":\"$tempUser\",\"password\":\"newTempPW456\"}"
    Write-Host "LOGIN with new password: OK"
  } catch {
    Write-Host "LOGIN with new password: FAILED -> $_"
  }

  try {
  $del = Invoke-RestMethod -Uri "$base/api/admin/users/$id" -Method DELETE -Headers $hdr
  $delj = $del | ConvertTo-Json -Compress
  Write-Host "DELETE user id=${id}: OK ->"
  Write-Host $delj
  } catch {
    Write-Host "DELETE user: FAILED -> $_"
  }

  try {
    $users = Invoke-RestMethod -Uri "$base/api/admin/users" -Method GET -Headers $hdr
    $exists = $users | Where-Object { $_.username -eq $tempUser }
    if ($exists) { Write-Host "VERIFY DELETE: Found user after delete" } else { Write-Host "VERIFY DELETE: User not present (OK)" }
  } catch {
    Write-Host "VERIFY DELETE failed -> $_"
  }
}

# 9) Test long invalid role creates 400
try {
  $badBody = @'
{
  "username": "badrole_e2e",
  "password": "pw",
  "role": "this-is-a-very-long-role-name-that-will-be-truncated",
  "full_name": "Bad Role User"
}
'@
  $b = Invoke-RestMethod -Uri "$base/api/admin/users" -Method POST -Headers $hdr -ContentType 'application/json' -Body $badBody
  Write-Host "BAD-ROLE create unexpectedly succeeded: $($b | ConvertTo-Json -Compress)"
} catch {
  Write-Host "BAD-ROLE create returned expected error -> $_"
}

# 10) Test DB status
try {
  $status = Invoke-RestMethod -Uri "$base/api/test-db" -Method GET
  Write-Host "TEST-DB: OK -> users_in_db=$($status.users_in_db) deals_in_db=$($status.deals_in_db)"
} catch {
  Write-Host "TEST-DB failed -> $_"
}

Write-Host "== E2E TESTS COMPLETE ==" 

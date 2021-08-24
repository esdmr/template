source (status dirname)/utils.fish

assert groupcmd pnpm i
assert groupcmd pnpm run build
assert groupcmd pnpm run api

set ed_commands_file (assert mktemp)

# This will move the first h2 to the top and then replace it with a h1. This
# will fix the title generated by the api-documenter.
echo '/^## /m0
s/^## /# /
wq
' >$ed_commands_file

# Apply that command to every file
for filename in (assert find build/docs -name '*.md')
    assert groupcmd ed $filename <$ed_commands_file
end

# Clean up the files
assert rm -f $ed_commands_file

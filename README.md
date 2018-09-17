# da-tracer - Database Agnostic Tracer

DA-Tracer! is a tool that helps you during you development process, when you want to know that is going on with your database at any time.

The first version dumps ALL the operations received by MongoDB in all databases and all collections.

Next versions will allow to select which objects you want to trace, which operations, etc.

# How Agnostic is it?!

For now, it only works with MongoDB 3.6 and greater. Sorry about that but it uses the awesome [Change Stream](https://docs.mongodb.com/manual/changeStreams/) introduced in that version.

It should be very easy to integrate with any other database that provides the same kind of stream.

# License and Copyright

Copyright 2018 - Luis Lobo Borobia - MIT License
